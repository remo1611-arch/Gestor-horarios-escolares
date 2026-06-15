from __future__ import annotations
import copy, statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any

def _impl():
    from quality_canonical import quality_analysis as qa, upgrade_output as uo
    return qa,uo

def quality_analysis(inp,base_out):
    return _impl()[0](inp,base_out)

def upgrade_output(inp,base_out):
    return _impl()[1](inp,base_out)
