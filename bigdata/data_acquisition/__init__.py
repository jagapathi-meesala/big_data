"""RADAR data acquisition: one-time downloads and the district<->grid mapping.

Scripts:
    download_imd_grid.py    IMD 0.25-degree daily rainfall (1901-present)
    download_oni.py         NOAA ONI (ENSO) monthly index
    download_flood_events.py district-level flood events (IFI / EM-DAT / GDACS)
    download_gadm.py        optional district polygons for polygon-based mapping
    district_grid_map.py    legacy-district centroids + grid-cell weight table

Every script is idempotent and safe to re-run; downloads land in
datasets/raw/ (git-ignored). Network access is only needed for downloads.
"""
