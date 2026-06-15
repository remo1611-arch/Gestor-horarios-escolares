from __future__ import annotations
import copy, statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any
NOW=datetime.now(timezone.utc).isoformat().replace("+00:00","Z")

def quality_analysis(inp: dict[str, Any], base_out: dict[str, Any]) -> dict[str, Any]:
    days = sorted(inp['calendar']['days'], key=lambda z: z['ordinal'])
    slots = sorted(inp['calendar']['timeSlots'], key=lambda z: z['ordinal'])
    teachers = {x['id']: x for x in inp['resources']['teachers']}
    groups = {x['id']: x for x in inp['resources']['groups']}
    activities = {x['id']: x for x in inp['activities']}
    spaces = {x['id']: x for x in inp['resources']['spaces']}
    assignments = base_out.get('assignments') or []
    by = {x['activityId']: x for x in assignments}
    slot_ord = {s['id']: s['ordinal'] for s in slots}
    nonbreak = [s['id'] for s in slots if s['kind'] != 'BREAK']
    teaching = [s['id'] for s in slots if s['kind'] == 'TEACHING']
    edges = set(nonbreak[:1] + nonbreak[-1:])
    prefs = {c['type']: c for c in inp.get('softConstraints', []) if c.get('active')}

    def assigned_teachers(a: dict[str, Any], ass: dict[str, Any]) -> list[str]:
        ids = ([ass.get('teacherId')] if ass.get('teacherId') else []) + list(a.get('requiredTeacherIds') or [])
        return list(dict.fromkeys(ids))

    teacher_slots: dict[tuple[str, str], set[str]] = defaultdict(set)
    teacher_lective: dict[tuple[str, str], set[str]] = defaultdict(set)
    teacher_activities: dict[str, list[tuple[dict[str, Any], dict[str, Any]]]] = defaultdict(list)
    group_activities: dict[str, list[tuple[dict[str, Any], dict[str, Any]]]] = defaultdict(list)
    group_area_day: Counter[tuple[str, str, str]] = Counter()
    teacher_rule: dict[str, Counter[str]] = defaultdict(Counter)
    group_rule: dict[str, Counter[str]] = defaultdict(Counter)
    violations: list[dict[str, Any]] = []

    for aid, ass in by.items():
        a = activities.get(aid)
        if not a:
            continue
        all_tids = assigned_teachers(a, ass)
        for tid in all_tids:
            teacher_activities[tid].append((a, ass))
        # The weighted model in P4-3 attributes soft constraints to the primary
        # assigned teacher. Required participants are retained in activity metrics
        # but do not retroactively change the optimized penalty.
        primary_tid = ass.get('teacherId')
        if primary_tid:
            teacher_slots[(primary_tid, ass['dayId'])].add(ass['timeSlotId'])
            if a.get('category') == 'LECTIVO':
                teacher_lective[(primary_tid, ass['dayId'])].add(ass['timeSlotId'])
        area = next((t for t in a.get('tags', []) if t.startswith('AREA-')), None)
        for gid in a.get('groupIds') or []:
            group_activities[gid].append((a, ass))
            if area:
                group_area_day[(gid, area, ass['dayId'])] += 1

    # Weighted preference units and allocations.
    rule_units: dict[str, float] = defaultdict(float)
    rule_related: dict[str, set[str]] = defaultdict(set)

    c = prefs.get('MINIMIZE_TEACHER_GAPS')
    if c:
        rid = c['id']
        for (tid, d), used in teacher_slots.items():
            idx = [i for i, x in enumerate(nonbreak) if x in used]
            gaps = sum(1 for i in range(min(idx)+1, max(idx)) if nonbreak[i] not in used) if len(idx) >= 2 else 0
            if gaps:
                pen = gaps * c['weight']
                rule_units[rid] += gaps
                rule_related[rid].update([tid, d])
                teacher_rule[tid][rid] += pen
                violations.append({'ruleId': rid, 'entityType': 'TEACHER', 'entityId': tid, 'units': gaps, 'penalty': pen, 'context': {'dayId': d}, 'message': f'{gaps} hueco(s) interno(s) en {d}.'})

    c = prefs.get('BALANCE_FIRST_LAST')
    if c and teaching:
        rid = c['id']; first, last = teaching[0], teaching[-1]
        for tid in teachers:
            fc = sum(first in teacher_lective.get((tid, d['id']), set()) for d in days)
            lc = sum(last in teacher_lective.get((tid, d['id']), set()) for d in days)
            diff = abs(fc - lc)
            if diff:
                pen = diff * c['weight']
                rule_units[rid] += diff
                rule_related[rid].add(tid)
                teacher_rule[tid][rid] += pen
                violations.append({'ruleId': rid, 'entityType': 'TEACHER', 'entityId': tid, 'units': diff, 'penalty': pen, 'context': {'firstCount': fc, 'lastCount': lc}, 'message': f'Diferencia de {diff} entre primeras ({fc}) y últimas ({lc}).'})

    c = prefs.get('DISTRIBUTE_AREA_DAYS')
    if c:
        rid = c['id']
        for (gid, area, d), n in sorted(group_area_day.items()):
            excess = max(0, n - 1)
            if excess:
                pen = excess * c['weight']
                rule_units[rid] += excess
                rule_related[rid].update([gid, area])
                group_rule[gid][rid] += pen
                violations.append({'ruleId': rid, 'entityType': 'GROUP', 'entityId': gid, 'units': excess, 'penalty': pen, 'context': {'dayId': d, 'areaId': area, 'sessions': n}, 'message': f'{n} sesiones de {area} en {d}.'})

    c = prefs.get('COMPACT_PART_TIME')
    if c:
        rid = c['id']
        for tid, t in teachers.items():
            if (t.get('maxLectivePerWeek') or 999) < 23:
                used_days = sum(bool(teacher_slots.get((tid, d['id']))) for d in days)
                units = max(0, used_days - 1)
                if units:
                    pen = units * c['weight']
                    rule_units[rid] += units
                    rule_related[rid].add(tid)
                    teacher_rule[tid][rid] += pen
                    violations.append({'ruleId': rid, 'entityType': 'TEACHER', 'entityId': tid, 'units': units, 'penalty': pen, 'context': {'presenceDays': used_days}, 'message': f'Jornada parcial distribuida en {used_days} días.'})

    c = prefs.get('AVOID_ISOLATED_SESSION')
    if c:
        rid = c['id']
        for (tid, d), used in teacher_lective.items():
            if len(used) == 1:
                pen = c['weight']
                rule_units[rid] += 1
                rule_related[rid].update([tid, d])
                teacher_rule[tid][rid] += pen
                violations.append({'ruleId': rid, 'entityType': 'TEACHER', 'entityId': tid, 'units': 1, 'penalty': pen, 'context': {'dayId': d}, 'message': f'Una única sesión lectiva en {d}.'})

    c = prefs.get('PREFER_LD_EDGE')
    if c:
        rid = c['id']
        for aid, ass in by.items():
            a = activities.get(aid)
            if a and a.get('category') == 'LD' and ass['timeSlotId'] not in edges:
                pen = c['weight']
                tids = assigned_teachers(a, ass)
                rule_units[rid] += 1
                rule_related[rid].add(aid)
                if tids:
                    teacher_rule[tids[0]][rid] += pen
                    entity_id = tids[0]
                else:
                    entity_id = aid
                violations.append({'ruleId': rid, 'entityType': 'TEACHER', 'entityId': entity_id, 'units': 1, 'penalty': pen, 'context': {'activityId': aid, 'dayId': ass['dayId'], 'timeSlotId': ass['timeSlotId']}, 'message': 'LD situada fuera del inicio o final de jornada.'})

    by_rule = []
    soft_outcomes = []
    components: dict[str, float] = {}
    for c in inp.get('softConstraints', []):
        if not c.get('active'):
            continue
        rid = c['id']; units = float(rule_units.get(rid, 0)); penalty = float(units * c['weight'])
        components[rid] = penalty
        rel = sorted(rule_related.get(rid, set()))
        msg = {
            'MINIMIZE_TEACHER_GAPS': 'Huecos internos del profesorado.',
            'BALANCE_FIRST_LAST': 'Desequilibrio entre primeras y últimas sesiones.',
            'DISTRIBUTE_AREA_DAYS': 'Repeticiones del mismo ámbito en un día.',
            'COMPACT_PART_TIME': 'Días de presencia del profesorado parcial.',
            'AVOID_ISOLATED_SESSION': 'Jornadas con una única sesión lectiva.',
            'PREFER_LD_EDGE': 'LD fuera de los extremos de la jornada.'
        }.get(c['type'], c.get('reason') or c['type'])
        by_rule.append({
            'constraintId': rid,
            'constraintType': c['type'],
            'scope': c['scope'],
            'weight': int(c['weight']),
            'rawUnits': units,
            'penalty': penalty,
            'satisfied': penalty == 0,
            'affectedEntityCount': len({v['entityId'] for v in violations if v['ruleId'] == rid}),
            'optimizationCoverage': 'OPTIMIZED_AND_MEASURED',
            'message': msg,
            'topRelatedIds': rel[:20]
        })
        soft_outcomes.append({
            'constraintId': rid,
            'constraintType': c['type'],
            'satisfied': penalty == 0,
            'penalty': penalty,
            'message': msg,
            'relatedIds': rel,
            'weight': int(c['weight'])
        })

    total_penalty = float(sum(components.values()))
    scale = max(1, len(activities) * 10)
    normalized_quality = round(100 / (1 + total_penalty / scale), 4)

    # Per-teacher metrics.
    by_teacher = []
    teacher_penalties = []
    recess_counts = []
    consecutive_values = []
    room_changes_values = []
    for tid in sorted(teachers):
        items = teacher_activities.get(tid, [])
        daily_lective = {d['id']: len(teacher_lective.get((tid, d['id']), set())) for d in days}
        gap_count = 0
        for d in days:
            used = teacher_slots.get((tid, d['id']), set())
            idx = [i for i, x in enumerate(nonbreak) if x in used]
            if len(idx) >= 2:
                gap_count += sum(1 for i in range(min(idx)+1, max(idx)) if nonbreak[i] not in used)
        isolated = sum(1 for v in daily_lective.values() if v == 1)
        first_count = sum(teaching and teaching[0] in teacher_lective.get((tid, d['id']), set()) for d in days)
        last_count = sum(teaching and teaching[-1] in teacher_lective.get((tid, d['id']), set()) for d in days)
        ld_total = sum(1 for a, _ in items if a.get('category') == 'LD')
        ld_edge = sum(1 for a, ass in items if a.get('category') == 'LD' and ass['timeSlotId'] in edges)
        dc_total = sum(1 for a, _ in items if a.get('category') == 'DC')
        recess = sum(1 for a, _ in items if a.get('organizationalSubtype') == 'RECESS_DUTY')
        presence_days = len({ass['dayId'] for _, ass in items})
        # Consecutive lective maximum.
        max_consecutive = 0
        room_changes = 0
        for d in days:
            lect = sorted((slot_ord[ass['timeSlotId']], ass.get('spaceId')) for a, ass in items if a.get('category') == 'LECTIVO' and ass['dayId'] == d['id'])
            run = 0; prev = None; prev_space = None
            for pos, sid in lect:
                if prev is not None and pos == prev + 1:
                    run += 1
                else:
                    run = 1
                max_consecutive = max(max_consecutive, run)
                if prev_space is not None and sid and prev_space != sid:
                    room_changes += 1
                prev = pos; prev_space = sid
        pen = float(sum(teacher_rule[tid].values()))
        q = round(100 / (1 + pen / max(10, len(items) * 10)), 4)
        teacher_penalties.append(pen); recess_counts.append(recess); consecutive_values.append(max_consecutive); room_changes_values.append(room_changes)
        by_teacher.append({
            'teacherId': tid,
            'penalty': pen,
            'normalizedQuality': q,
            'metrics': {
                'totalActivities': len(items),
                'lectiveSessions': sum(daily_lective.values()),
                'presenceDays': presence_days,
                'gapCount': gap_count,
                'isolatedLectiveDays': isolated,
                'firstLectiveCount': int(first_count),
                'lastLectiveCount': int(last_count),
                'firstLastImbalance': abs(int(first_count) - int(last_count)),
                'maxConsecutiveLective': max_consecutive,
                'recessDuties': recess,
                'ldTotal': ld_total,
                'ldAtEdge': ld_edge,
                'dcTotal': dc_total,
                'roomChanges': room_changes,
                'dailyLectiveSpread': (max(daily_lective.values()) - min(daily_lective.values())) if daily_lective else 0,
                'requiredParticipationActivities': sum(1 for a, ass in items if tid in (a.get('requiredTeacherIds') or []) and ass.get('teacherId') != tid)
            },
            'dailyLective': daily_lective,
            'rulePenalties': {k: float(v) for k, v in sorted(teacher_rule[tid].items())}
        })

    # Per-group metrics.
    by_group = []
    group_penalties = []
    group_spreads = []
    for gid in sorted(groups):
        items = group_activities.get(gid, [])
        daily = {d['id']: sum(1 for a, ass in items if a.get('category') == 'LECTIVO' and ass['dayId'] == d['id']) for d in days}
        repeated = sum(max(0, n-1) for (g, _area, _day), n in group_area_day.items() if g == gid)
        room_changes = 0
        for d in days:
            seq = sorted((slot_ord[ass['timeSlotId']], ass.get('spaceId')) for a, ass in items if a.get('category') == 'LECTIVO' and ass['dayId'] == d['id'])
            prev_space = None
            for _, sid in seq:
                if prev_space is not None and sid and prev_space != sid:
                    room_changes += 1
                prev_space = sid
        pen = float(sum(group_rule[gid].values()))
        q = round(100 / (1 + pen / max(10, len(items) * 10)), 4)
        spread = (max(daily.values()) - min(daily.values())) if daily else 0
        group_penalties.append(pen); group_spreads.append(spread)
        by_group.append({
            'groupId': gid,
            'penalty': pen,
            'normalizedQuality': q,
            'metrics': {
                'totalActivities': len(items),
                'lectiveSessions': sum(daily.values()),
                'repeatedAreaSameDay': repeated,
                'maxDailyLective': max(daily.values()) if daily else 0,
                'minDailyLective': min(daily.values()) if daily else 0,
                'dailyLectiveSpread': spread,
                'roomChanges': room_changes
            },
            'dailyLective': daily,
            'rulePenalties': {k: float(v) for k, v in sorted(group_rule[gid].items())}
        })

    # Explanations: hard issues first, then highest weighted violations, then contextual positives.
    explanations = []
    for i, hv in enumerate(base_out.get('hardViolations') or []):
        explanations.append({
            'id': f'EXP-HARD-{i+1:03d}', 'level': 'CRITICAL', 'entityType': 'GLOBAL', 'entityId': 'GLOBAL',
            'ruleId': hv.get('constraintId'), 'title': 'Incumplimiento obligatorio', 'message': hv.get('message') or hv.get('constraintType', 'Restricción obligatoria'),
            'evidence': {'relatedIds': hv.get('relatedIds', []), 'penalty': hv.get('penalty', 0)},
            'recommendation': 'Resolver la restricción obligatoria antes de considerar el horario válido.'
        })
    top_n = int(inp['qualityProfile']['topFindings'])
    ranked = sorted(violations, key=lambda v: (-v['penalty'], v['ruleId'], v['entityId']))
    for i, v in enumerate(ranked[:top_n]):
        title_map = {
            'SC-MINIMIZE_TEACHER_GAPS': 'Huecos en la jornada docente',
            'SC-BALANCE_FIRST_LAST': 'Desequilibrio de primeras y últimas',
            'SC-DISTRIBUTE_AREA_DAYS': 'Área concentrada en el mismo día',
            'SC-COMPACT_PART_TIME': 'Jornada parcial dispersa',
            'SC-AVOID_ISOLATED_SESSION': 'Sesión lectiva aislada',
            'SC-PREFER_LD_EDGE': 'LD en franja interior'
        }
        rec_map = {
            'SC-MINIMIZE_TEACHER_GAPS': 'Revisar movimientos compatibles que compacten la presencia sin crear solapes.',
            'SC-BALANCE_FIRST_LAST': 'Comparar alternativas que redistribuyan primeras y últimas sesiones.',
            'SC-DISTRIBUTE_AREA_DAYS': 'Mover una de las sesiones del área a otro día compatible.',
            'SC-COMPACT_PART_TIME': 'Concentrar la actividad del puesto parcial en menos días cuando sea posible.',
            'SC-AVOID_ISOLATED_SESSION': 'Agrupar la sesión con otra actividad del mismo día o moverla.',
            'SC-PREFER_LD_EDGE': 'Valorar una franja inicial o final si no perjudica la cobertura.'
        }
        explanations.append({
            'id': f'EXP-SOFT-{i+1:03d}', 'level': 'WARNING', 'entityType': v['entityType'], 'entityId': v['entityId'],
            'ruleId': v['ruleId'], 'title': title_map.get(v['ruleId'], 'Preferencia no satisfecha'), 'message': v['message'],
            'evidence': {'units': v['units'], 'penalty': v['penalty'], **v['context']},
            'recommendation': rec_map.get(v['ruleId'], 'Comparar una alternativa con menor penalización.')
        })
    if not base_out.get('hardViolations'):
        explanations.insert(0, {
            'id': 'EXP-GLOBAL-VALID', 'level': 'INFO', 'entityType': 'GLOBAL', 'entityId': 'GLOBAL', 'ruleId': None,
            'title': 'Validez obligatoria superada', 'message': 'La propuesta no presenta incumplimientos obligatorios según el contrato 1.3.',
            'evidence': {'assignmentCount': len(assignments), 'activityCount': len(activities)},
            'recommendation': 'Usar el análisis ponderado para comparar alternativas; no interpretar la puntuación como aprobación automática.'
        })

    tp_mean = statistics.fmean(teacher_penalties) if teacher_penalties else 0.0
    gp_mean = statistics.fmean(group_penalties) if group_penalties else 0.0
    indicators = {
        'teacherPenaltyMin': min(teacher_penalties) if teacher_penalties else 0,
        'teacherPenaltyMax': max(teacher_penalties) if teacher_penalties else 0,
        'teacherPenaltyRange': (max(teacher_penalties)-min(teacher_penalties)) if teacher_penalties else 0,
        'recessDutyMin': min(recess_counts) if recess_counts else 0,
        'recessDutyMax': max(recess_counts) if recess_counts else 0,
        'recessDutyRange': (max(recess_counts)-min(recess_counts)) if recess_counts else 0,
        'maxConsecutiveLectiveObserved': max(consecutive_values) if consecutive_values else 0,
        'averageMaxConsecutiveLective': round(statistics.fmean(consecutive_values), 4) if consecutive_values else 0,
        'totalTeacherRoomChanges': sum(room_changes_values),
        'averageGroupDailySpread': round(statistics.fmean(group_spreads), 4) if group_spreads else 0,
        'unassignedActivities': len(base_out.get('unassignedActivityIds') or [])
    }

    return {
        'analysisVersion': '1.0',
        'generatedAt': NOW,
        'weightsStatus': inp['qualityProfile']['weightsStatus'],
        'interpretation': inp['qualityProfile']['interpretation'],
        'global': {
            'hardValid': not bool(base_out.get('hardViolations')),
            'hardViolationCount': len(base_out.get('hardViolations') or []),
            'softPenalty': total_penalty,
            'normalizedQuality': normalized_quality,
            'activePreferenceCount': len(by_rule),
            'satisfiedPreferenceCount': sum(1 for r in by_rule if r['satisfied']),
            'assignmentCount': len(assignments),
            'activityCount': len(activities),
            'teacherPenaltyMean': round(tp_mean, 4),
            'teacherPenaltyStdDev': round(statistics.pstdev(teacher_penalties), 4) if len(teacher_penalties) > 1 else 0.0,
            'groupPenaltyMean': round(gp_mean, 4),
            'groupPenaltyStdDev': round(statistics.pstdev(group_penalties), 4) if len(group_penalties) > 1 else 0.0
        },
        'byRule': sorted(by_rule, key=lambda r: (-r['penalty'], r['constraintId'])),
        'byTeacher': sorted(by_teacher, key=lambda r: (-r['penalty'], r['teacherId'])),
        'byGroup': sorted(by_group, key=lambda r: (-r['penalty'], r['groupId'])),
        'indicators': indicators,
        'explanations': explanations[:max(top_n + 5, 10)],
        'methodology': {
            'weightedPreferences': [c['type'] for c in inp.get('softConstraints', []) if c.get('active')],
            'unweightedIndicators': ['DAILY_LECTIVE_SPREAD', 'MAX_CONSECUTIVE_LECTIVE', 'RECESS_DUTY_RANGE', 'ROOM_CHANGES'],
            'normalizationFormula': '100 / (1 + softPenalty / (activityCount * 10))',
            'allocationPolicy': 'Cada unidad de penalización se asigna al docente o grupo directamente afectado; no se distribuye artificialmente entre entidades no implicadas.',
            'limitations': [
                'Los pesos son provisionales y no representan todavía criterios aprobados por Centro Demo.',
                'Los indicadores no ponderados se informan, pero no cambian la solución del motor en P4-4.',
                'Una calidad alta no corrige datos incompletos ni sustituye la validación de jefatura.',
                'La puntuación solo es comparable entre alternativas construidas con el mismo contrato, datos y perfil de pesos.'
            ]
        }
    }


def upgrade_output(inp: dict[str, Any], base_out: dict[str, Any]) -> dict[str, Any]:
    o = copy.deepcopy(base_out)
    qa = quality_analysis(inp, base_out)
    o['schemaId'] = 'ghf_solver_output_1.3'
    o['contractVersion'] = '1.3'
    o['qualityAnalysis'] = qa
    o['score']['softPenalty'] = qa['global']['softPenalty']
    o['score']['normalizedQuality'] = qa['global']['normalizedQuality']
    o['score']['components'] = {r['constraintId']: r['penalty'] for r in qa['byRule']}
    o['softOutcomes'] = [
        {
            'constraintId': r['constraintId'], 'constraintType': r['constraintType'], 'satisfied': r['satisfied'],
            'penalty': r['penalty'], 'message': r['message'], 'relatedIds': r.get('topRelatedIds', []), 'weight': r['weight']
        } for r in qa['byRule']
    ]
    # Keep engine truth; P4-4 is an analysis layer, not a new solver claim.
    o['engine'] = dict(o['engine'])
    o['engine']['adapterVersion'] = '0.4.4-quality-layer'
    return o

