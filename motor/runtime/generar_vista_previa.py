from __future__ import annotations
import argparse, hashlib, json
from datetime import datetime, timezone
from pathlib import Path

def canonical_hash(x):
    return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()

def same(a,b):
    if a is None or b is None: return a is b
    return all(a.get(k)==b.get(k) for k in ("dayId","timeSlotId","teacherId","spaceId"))

def generate(inp,out):
    proposed={x["activityId"]:{k:x.get(k) for k in ("dayId","timeSlotId","teacherId","spaceId")} for x in out.get("assignments",[])}
    changes=[]; counts={k:0 for k in ("added","moved","unchanged","unassigned","preservedLocks")}; locked_changes=0
    for a in inp.get("activities",[]):
        before=a.get("currentAssignment"); after=proposed.get(a["id"])
        if after is None: typ="UNASSIGNED"; counts["unassigned"]+=1
        elif before is None: typ="ADDED"; counts["added"]+=1
        elif same(before,after): typ="UNCHANGED"; counts["unchanged"]+=1
        else: typ="MOVED"; counts["moved"]+=1
        if a.get("locked") and typ=="UNCHANGED": counts["preservedLocks"]+=1
        if a.get("locked") and typ not in ("UNCHANGED",): locked_changes+=1
        changes.append({"activityId":a["id"],"changeType":typ,"before":before,"after":after,"locked":bool(a.get("locked"))})
    solver_status=out.get("status")
    valid=solver_status in ("OPTIMAL","FEASIBLE") and out.get("score",{}).get("hardViolationCount",0)==0 and locked_changes==0
    status="READY_FOR_PREVIEW" if valid else ("PARTIAL_PREVIEW" if out.get("assignments") and solver_status in ("PARTIAL","TIME_LIMIT") else "REJECTED")
    return {
      "schemaId":"ghf_schedule_preview_1.0","previewVersion":"1.0","proposalId":f"PREVIEW-{inp['run']['runId']}","runId":inp['run']['runId'],"status":status,
      "source":{"inputSha256":canonical_hash(inp),"outputSha256":canonical_hash(out),"sourceVersionId":inp.get("provenance",{}).get("sourceVersionId")},
      "summary":{"totalActivities":len(inp.get("activities",[])),"proposedAssignments":len(out.get("assignments",[])),**counts},
      "changes":changes,
      "validation":{"solverStatus":solver_status,"hardViolationCount":out.get("score",{}).get("hardViolationCount",0),"lockedChanges":locked_changes,"validForAcceptance":valid},
      "applyPolicy":{"mode":"NO_DIRECT_WRITE","requiresExplicitAcceptance":True,"targetVersionMode":"CREATE_NEW_DRAFT","directWriteAllowed":False},
      "createdAt":datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
    }

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('input'); ap.add_argument('output'); ap.add_argument('preview'); args=ap.parse_args()
    inp=json.load(open(args.input,encoding='utf-8')); out=json.load(open(args.output,encoding='utf-8')); p=generate(inp,out)
    Path(args.preview).write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({"status":p["status"],**p["summary"]},ensure_ascii=False))
if __name__=='__main__':main()
