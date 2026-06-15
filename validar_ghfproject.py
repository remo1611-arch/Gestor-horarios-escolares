#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re, stat, sys, zipfile
from pathlib import Path, PurePosixPath

MAX_MEMBERS=500; MAX_MEMBER=25*1024*1024; MAX_TOTAL=200*1024*1024; MAX_RATIO=250
EXECUTABLE_EXT={'.exe','.dll','.com','.bat','.cmd','.msi','.scr','.ps1','.sh','.app','.dmg','.jar','.class','.vbs','.js','.mjs','.wasm'}
HEX64=re.compile(r'^[a-f0-9]{64}$')
ID_RE=re.compile(r'^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$')
KNOWN_REQUIRED={'CANONICAL_PROJECT','EXPLICIT_ACCEPTANCE','NO_DIRECT_WRITE'}

def safe_name(name:str)->bool:
    if not name or '\\' in name or '\x00' in name or name.startswith('/') or re.match(r'^[A-Za-z]:',name): return False
    parts=name.split('/')
    if any(x in {'','.','..'} for x in parts): return False
    if PurePosixPath(name).suffix.lower() in EXECUTABLE_EXT: return False
    return True

def load_json(z,name): return json.loads(z.read(name).decode('utf-8'))
def add(checks,name,ok,detail=''): checks.append({'name':name,'pass':bool(ok),'detail':detail})
def ids(items): return [x.get('id') for x in items if isinstance(x,dict)]

def validate(path:Path, schema_dir:Path|None=None, skip_jsonschema:bool=False):
    checks=[]; errors=[]; warnings=[]
    try:
        with zipfile.ZipFile(path) as z:
            add(checks,'ZIP íntegro',z.testzip() is None)
            infos=z.infolist(); add(checks,'Máximo de miembros',len(infos)<=MAX_MEMBERS,str(len(infos)))
            names=[]; total=0
            for info in infos:
                name=info.filename; names.append(name); total+=info.file_size
                if not safe_name(name): errors.append(f'Ruta no permitida: {name}')
                if info.flag_bits & 1: errors.append(f'Miembro cifrado: {name}')
                mode=(info.external_attr>>16)&0o170000
                if mode==stat.S_IFLNK: errors.append(f'Enlace simbólico: {name}')
                if info.file_size>MAX_MEMBER: errors.append(f'Miembro demasiado grande: {name}')
                if info.compress_size and info.file_size/info.compress_size>MAX_RATIO: errors.append(f'Relación de compresión excesiva: {name}')
            if len(names)!=len(set(names)): errors.append('Rutas ZIP duplicadas')
            if total>MAX_TOTAL: errors.append('Tamaño total descomprimido excesivo')
            add(checks,'Rutas y límites seguros',not errors,'; '.join(errors[:5]))
            required={'envelope.json','project.json','manifest.sha256'}
            add(checks,'Miembros obligatorios',required.issubset(names),', '.join(sorted(required-set(names))))
            if not required.issubset(names): raise ValueError('Faltan miembros obligatorios')
            manifest={}
            for line in z.read('manifest.sha256').decode('utf-8').replace('\r','').splitlines():
                if not line: continue
                m=re.match(r'^([a-f0-9]{64})  (.+)$',line)
                if not m: errors.append(f'Línea de manifiesto inválida: {line[:80]}'); continue
                name=m.group(2)
                if name=='manifest.sha256' or name in manifest or not safe_name(name): errors.append(f'Ruta de manifiesto inválida: {name}')
                manifest[name]=m.group(1)
            actual=sorted(n for n in names if n!='manifest.sha256')
            manifest_ok=sorted(manifest)==actual
            for name in actual:
                if manifest.get(name)!=hashlib.sha256(z.read(name)).hexdigest(): manifest_ok=False; errors.append(f'SHA-256 incorrecto: {name}')
            add(checks,'Manifiesto SHA-256',manifest_ok,f'{len(manifest)}/{len(actual)}')
            env=load_json(z,'envelope.json'); project=load_json(z,'project.json')
            add(checks,'Envelope canónico',env.get('containerSchemaId')=='ghf_container_1.0' and env.get('projectSchemaId')=='ghf_project_1.0')
            add(checks,'Proyecto canónico',project.get('schemaId')=='ghf_project_1.0' and project.get('schemaVersion')=='1.0.0')
            major=str(env.get('projectSchemaVersion','')).split('.')[0]
            add(checks,'Versión mayor compatible',major=='1',str(env.get('projectSchemaVersion')))
            unknown=[x for x in env.get('capabilities',{}).get('required',[]) if x not in KNOWN_REQUIRED]
            add(checks,'Capacidades obligatorias conocidas',not unknown,', '.join(unknown))
            pbytes=z.read('project.json'); ph=hashlib.sha256(pbytes).hexdigest()
            add(checks,'Hash project.json en envelope',env.get('integrity',{}).get('projectSha256')==ph,ph)
            w=project.get('workflowPolicy',{})
            invariant=(w.get('directWriteAllowed') is False and w.get('previewRequired') is True and w.get('explicitAcceptanceRequired') is True and w.get('repairCreatesCopy') is True and w.get('automaticPlacement') is False)
            add(checks,'Invariantes workflow',invariant)
            # IDs and references
            collections=['groups','teachers','subjects','spaces','teachingNeeds','organizationalActivities','constraints']
            maps={k:set(ids(project.get(k,[]))) for k in collections}
            dup=[]
            for k in collections:
                seq=ids(project.get(k,[]));
                if len(seq)!=len(set(seq)): dup.append(k)
            add(checks,'IDs únicos',not dup,', '.join(dup))
            refs=[]
            for g in project.get('groups',[]): 
                if g.get('tutorTeacherId') and g['tutorTeacherId'] not in maps['teachers']: refs.append(f"grupo {g.get('id')} tutor")
                if g.get('homeSpaceId') and g['homeSpaceId'] not in maps['spaces']: refs.append(f"grupo {g.get('id')} espacio")
            for n in project.get('teachingNeeds',[]):
                if n.get('groupId') not in maps['groups']: refs.append(f"necesidad {n.get('id')} grupo")
                if n.get('subjectId') not in maps['subjects']: refs.append(f"necesidad {n.get('id')} materia")
                tr=n.get('teacherRequirement',{})
                for tid in tr.get('fixedTeacherIds',[])+tr.get('allowedTeacherIds',[]):
                    if tid not in maps['teachers']: refs.append(f"necesidad {n.get('id')} docente {tid}")
            days={x.get('id') for x in project.get('timeModel',{}).get('days',[])}; slots={x.get('id') for x in project.get('timeModel',{}).get('slots',[])}
            sessions=project.get('schedule',{}).get('sessions',[])
            for s in sessions:
                if s.get('sourceNeedId') and s['sourceNeedId'] not in maps['teachingNeeds']: refs.append(f"sesión {s.get('id')} necesidad")
                if s.get('organizationalActivityId') and s['organizationalActivityId'] not in maps['organizationalActivities']: refs.append(f"sesión {s.get('id')} actividad")
                if s.get('subjectId') and s['subjectId'] not in maps['subjects']: refs.append(f"sesión {s.get('id')} materia")
                for tid in s.get('teacherIds',[]):
                    if tid not in maps['teachers']: refs.append(f"sesión {s.get('id')} docente {tid}")
                for gid in s.get('groupIds',[]):
                    if gid not in maps['groups']: refs.append(f"sesión {s.get('id')} grupo {gid}")
                pl=s.get('placement')
                if pl:
                    if pl.get('dayId') not in days or pl.get('slotId') not in slots: refs.append(f"sesión {s.get('id')} tiempo")
                    if pl.get('spaceId') and pl['spaceId'] not in maps['spaces']: refs.append(f"sesión {s.get('id')} espacio")
                if s.get('state')=='UNPLACED' and pl is not None: refs.append(f"sesión {s.get('id')} UNPLACED con placement")
            add(checks,'Referencias semánticas',not refs,'; '.join(refs[:8]))
            add(checks,'Autoridad única de sesiones',not any(k in project for k in ['acceptedAssignments','locks','assignments']))
            # Optional full JSON Schema if installed.
            schema_checked=False
            try:
                if skip_jsonschema: raise ModuleNotFoundError
                import jsonschema
                if schema_dir and schema_dir.exists():
                    ps=json.loads((schema_dir/'ESQUEMA_PROJECT_GHFPROJECT_1_0.schema.json').read_text(encoding='utf-8'))
                    es=json.loads((schema_dir/'ESQUEMA_ENVELOPE_GHFPROJECT_1_0.schema.json').read_text(encoding='utf-8'))
                    jsonschema.Draft202012Validator.check_schema(ps);jsonschema.Draft202012Validator.check_schema(es)
                    jsonschema.Draft202012Validator(ps,format_checker=jsonschema.FormatChecker()).validate(project)
                    jsonschema.Draft202012Validator(es,format_checker=jsonschema.FormatChecker()).validate(env)
                    schema_checked=True
            except ModuleNotFoundError:
                warnings.append('jsonschema no instalado: se aplicó validación estructural y semántica integrada.')
            except Exception as exc:
                errors.append(f'JSON Schema: {exc}')
            add(checks,'JSON Schema completo (si disponible)',schema_checked or not any(x.startswith('JSON Schema:') for x in errors),'completo' if schema_checked else 'validador integrado')
            result={'file':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'members':len(infos),'sessions':len(sessions),'checks':checks,'passed':sum(x['pass'] for x in checks),'total':len(checks),'warnings':warnings,'errors':errors}
    except Exception as exc:
        errors.append(str(exc));result={'file':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None,'members':0,'sessions':0,'checks':checks,'passed':sum(x['pass'] for x in checks),'total':len(checks),'warnings':warnings,'errors':errors}
    result['ok']=all(x['pass'] for x in result['checks']) and not errors
    return result

def main():
    ap=argparse.ArgumentParser(description='Valida un contenedor GHFProject 1.0 sin modificarlo.')
    ap.add_argument('file',type=Path);ap.add_argument('--schema-dir',type=Path,default=Path(__file__).resolve().parent/'schemas_ghfproject_1_0');ap.add_argument('--skip-jsonschema',action='store_true')
    args=ap.parse_args();out=validate(args.file,args.schema_dir,args.skip_jsonschema);print(json.dumps(out,ensure_ascii=False,indent=2));return 0 if out['ok'] else 1
if __name__=='__main__': raise SystemExit(main())
