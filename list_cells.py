import json

nb = json.load(open('CareerNova_fixed.ipynb', encoding='utf-8'))
print(f"Total cells: {len(nb['cells'])}")
for i, c in enumerate(nb['cells']):
    src = ''.join(c['source'])
    if i >= 22:
        print(f'--- CELL {i} ({c["cell_type"]}) ---')
        print(src[:1000])
        print()
