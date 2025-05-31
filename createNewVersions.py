import os
import shutil
import re

asctb_root = os.path.join(os.path.dirname(__file__), 'hra-kg', 'digital-objects', 'asct-b')

def get_latest_version_path(organ_path):
    versions = []
    for entry in os.listdir(organ_path):
        if entry.startswith("v") and os.path.isdir(os.path.join(organ_path, entry)):
            try:
                versions.append((entry, list(map(int, entry[1:].split(".")))))
            except ValueError:
                continue
    if not versions:
        return None, None
    latest_entry = sorted(versions, key=lambda x: x[1], reverse=True)[0]
    latest_version = latest_entry[0]
    next_version_parts = latest_entry[1]
    next_version_parts[-1] += 1
    next_version = 'v' + '.'.join(map(str, next_version_parts))
    return os.path.join(organ_path, latest_version), os.path.join(organ_path, next_version)

def comment_out_fields(metadata_path, new_version):
    if not os.path.exists(metadata_path):
        return
    try:
        with open(metadata_path, 'r') as f:
            lines = f.readlines()

        updated_lines = []
        for line in lines:
            stripped = line.strip()
            if any(stripped.startswith(field + ":") for field in ['hubmapId', 'doi']):
                updated_lines.append('# ' + line if not stripped.startswith('#') else line)
            elif stripped.startswith('citation:'):
                # Replace Accessed date and version number in the citation line
                line = re.sub(r'Accessed\s+[A-Za-z]+\s+\d{1,2},\s*\d{4}', 'Accessed June 15, 2025', line)
                line = re.sub(r'v\d+\.\d+', new_version, line)
                updated_lines.append('# ' + line if not stripped.startswith('#') else line)
            elif stripped.startswith('creation_date:'):
                updated_lines.append(f'creation_date: 2025-06-15\n')
            else:
                updated_lines.append(line)

        with open(metadata_path, 'w') as f:
            f.writelines(updated_lines)

        print(f"📝 Updated metadata in {metadata_path}")
    except Exception as e:
        print(f"❌ Error updating metadata in {metadata_path}: {e}")

def main():
    for organ in os.listdir(asctb_root):
        organ_path = os.path.join(asctb_root, organ)
        if os.path.isdir(organ_path):
            latest_path, new_path = get_latest_version_path(organ_path)
            if latest_path and not os.path.exists(new_path):
                shutil.copytree(latest_path, new_path)
                print(f"✅ Created {new_path} from {latest_path}")
                metadata_path = os.path.join(new_path, 'raw', 'metadata.yaml')
                comment_out_fields(metadata_path, os.path.basename(new_path))

if __name__ == "__main__":
    main()
