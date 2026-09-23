# Regenerates src/domain/nutrition/recipes-data.ts from USDA SR Legacy.
#   1. Download https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
#      and unzip it into ./sr next to these scripts (not committed — 6 MB zip, ~100 MB unpacked).
#   2. Edit recipes.py (ingredient table + per-serving grams).  `python recipes.py` prints each recipe's
#      totals and the 4/4/9 energy check.
#   3. `python gen_recipes_ts.py` writes recipes.gen.ts; copy it to src/domain/nutrition/recipes-data.ts
#      and run node --test.
import csv, sys, pickle, os
D='sr/FoodData_Central_sr_legacy_food_csv_2018-04/'
if not os.path.exists('usda.pkl'):
    foods={r['fdc_id']:r['description'] for r in csv.DictReader(open(D+'food.csv',encoding='utf-8'))}
    want={'1008':'kcal','1003':'protein','1004':'fat','1005':'carb'}
    nut={}
    for r in csv.DictReader(open(D+'food_nutrient.csv',encoding='utf-8')):
        k=want.get(r['nutrient_id'])
        if k: nut.setdefault(r['fdc_id'],{})[k]=float(r['amount'])
    pickle.dump((foods,nut),open('usda.pkl','wb'))
foods,nut=pickle.load(open('usda.pkl','rb'))
if __name__=='__main__':
    terms=[t.lower() for t in sys.argv[1:]]
    hits=[(i,d) for i,d in foods.items() if all(t in d.lower() for t in terms)]
    for i,d in sorted(hits,key=lambda x:len(x[1]))[:12]:
        n=nut.get(i,{}); print(i, d, '|', n.get('kcal'), n.get('protein'), n.get('fat'), n.get('carb'))
