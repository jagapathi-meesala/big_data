"""Bootstrap: make `import config` work regardless of cwd / spark-submit."""
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent        # bigdata/data_acquisition
_BIGDATA = _HERE.parent                        # bigdata/
for _p in (str(_BIGDATA), str(_HERE)):
    if _p not in sys.path:
        sys.path.insert(0, _p)
