import os
import csv

DATASETS_DIR = "/home/jagapathi/Downloads/big/datasets"

def filter_csv_file(filepath):
    print(f"Processing {os.path.basename(filepath)}...")
    
    with open(filepath, mode='r', encoding='utf-8', errors='ignore') as infile:
        reader = csv.reader(infile)
        headers = next(reader, None)
        if not headers:
            return
        
        state_col_idx = -1
        subdivision_col_idx = -1
        
        # 1. Search for specific state columns first
        for idx, header in enumerate(headers):
            h_lower = header.lower().strip()
            if h_lower in ["state", "state name", "detected state", "state_name"]:
                state_col_idx = idx
                break
            elif h_lower in ["subdivision"]:
                subdivision_col_idx = idx
                break
        
        # 2. Fallback to "name" only if it represents the state name in states datasets
        if state_col_idx == -1 and subdivision_col_idx == -1:
            for idx, header in enumerate(headers):
                h_lower = header.lower().strip()
                if h_lower == "name" and os.path.basename(filepath) in ["india_states.csv", "india_states_daily.csv", "final_states.csv"]:
                    state_col_idx = idx
                    break
                
        if state_col_idx == -1 and subdivision_col_idx == -1:
            print(f"Skipping {os.path.basename(filepath)} (no state/subdivision column detected).")
            return
            
        filtered_rows = []
        for row in reader:
            if not row:
                continue
            match = False
            if state_col_idx != -1 and state_col_idx < len(row):
                val = row[state_col_idx].strip().lower()
                if val in ["andhra pradesh", "telangana", "ap"]:
                    match = True
            elif subdivision_col_idx != -1 and subdivision_col_idx < len(row):
                val = row[subdivision_col_idx].strip().lower()
                if val in ["coastal andhra pradesh", "rayalaseema", "telangana"]:
                    match = True
            
            if match:
                filtered_rows.append(row)
                
    print(f"Filtered {len(filtered_rows)} rows matching AP/Telangana.")
    with open(filepath, mode='w', encoding='utf-8', newline='') as outfile:
        writer = csv.writer(outfile)
        writer.writerow(headers)
        writer.writerows(filtered_rows)

if __name__ == "__main__":
    for root, dirs, files in os.walk(DATASETS_DIR):
        for file in files:
            if file.endswith(".csv"):
                filter_csv_file(os.path.join(root, file))
    print("AP/Telangana filtering complete.")
