"""Grocery metadata for every ingredient: aisle, how it is bought, staple, and a sourced price.

Prices, per pound of what is sold unless noted:
  ERS  = USDA Economic Research Service, Fruit and Vegetable Prices (2023 data, updated 2025-12-09)
         https://www.ers.usda.gov/data-products/fruit-and-vegetable-prices
  BLS  = Bureau of Labor Statistics, Average Price Data, U.S. city average, August 2026
         (series APU0000<item>) https://www.bls.gov/cpi/factsheets/average-prices.htm
An ingredient with no public government price is left UNPRICED — the screen says how many, rather than
inventing a number.
"""
import csv, json

LB = 453.6
P, MF, DE, PA, SP = 'Produce', 'Meat & Fish', 'Dairy & Eggs', 'Pantry', 'Spices'

ers = {}
for f in ('fruit.csv', 'veg.csv'):
    for r in csv.reader(open('prices/' + f, encoding='utf-8-sig')):
        if len(r) > 3 and r[3] == 'per pound' and r[2]:
            ers[(r[0], r[1])] = float(r[2])

bls = {}
for f in ('bls.json', 'bls2.json'):
    for s in json.load(open('prices/' + f))['Results']['series']:
        d = [x for x in s['data'] if x['value'] not in ('-', '')]
        if d:
            bls[s['seriesID'].replace('APU0000', '')] = (float(d[0]['value']), f"{d[0]['year']}-{d[0]['period'][1:]}")

def e(name, form, yield_=1.0):
    """ERS $/lb of product → $/100 g of the ingredient as the recipe weighs it."""
    return {'per100g': round(ers[(name, form)] / (LB / 100) / yield_, 4), 'source': f'USDA ERS · {name}, {form.lower()} · 2023'}

def b(code, per_grams=LB, label=None, yield_=1.0):
    """BLS price for `per_grams` grams of product → $/100 g as used."""
    v, when = bls[code]
    return {'per100g': round(v / (per_grams / 100) / yield_, 4), 'source': f'BLS {code} · {label or code} · {when}'}

# key: (aisle, buy, staple, price-or-None)
#   buy: ('lb',) · ('dozen',) · ('each', g, one, many) · ('pack', g, unit)
G = {
 'greek_yogurt': (DE, ('pack', 907, 'tub'), False, b('FJ4101', 226.8, 'Yogurt, per 8 oz')),
 'granola': (PA, ('pack', 340, 'bag'), False, None),
 'blueberries': (P, ('pack', 170, 'pack'), False, e('Blueberries', 'Fresh')),
 'strawberries': (P, ('pack', 454, '1-lb pack'), False, e('Strawberries', 'Fresh')),
 'honey': (PA, ('pack', 340, 'jar'), True, None),
 'sirloin': (MF, ('lb',), False, b('703613', label='Sirloin steak, boneless')),
 'egg': (DE, ('dozen',), False, b('708111', 600, 'Eggs, large, per dozen')),
 'boiled_egg': (DE, ('dozen',), False, b('708111', 600, 'Eggs, large, per dozen')),
 'potato': (P, ('lb',), False, b('712112', label='Potatoes, white')),
 'red_pepper': (P, ('each', 150, 'bell pepper', 'bell peppers'), False, e('Red peppers', 'Fresh')),
 'olive_oil': (PA, ('pack', 500, 'bottle'), True, None),
 'oats': (PA, ('pack', 510, 'canister'), False, None),
 'peanut_butter': (PA, ('pack', 454, 'jar'), False, None),
 'banana': (P, ('each', 118, 'banana', 'bananas'), False, b('711211', label='Bananas')),
 'rice_milk': (DE, ('pack', 1890, 'carton'), False, None),
 'smoked_salmon': (MF, ('pack', 113, '4-oz pack'), False, None),
 'bagel': (PA, ('pack', 570, 'pack of 6'), False, None),
 'cream_cheese': (DE, ('pack', 227, 'block'), False, None),
 'capers': (PA, ('pack', 100, 'jar'), False, None),
 'tofu': (P, ('pack', 396, 'block'), False, None),
 'black_beans': (PA, ('pack', 250, 'can'), False, e('Black beans', 'Canned', 0.6)),
 'spinach': (P, ('pack', 142, 'bag'), False, e('Spinach, eaten raw', 'Fresh')),
 'flour_tortilla': (PA, ('pack', 576, 'pack of 8'), False, None),
 'flour': (PA, ('pack', 2270, 'bag'), True, b('701111', label='Flour, all purpose')),
 'whey': (PA, ('pack', 907, 'tub'), False, None),
 'milk': (DE, ('pack', 1950, 'half gallon'), False, b('FJ1101', 3900, 'Milk, low-fat, per gallon')),
 'turkey_sausage': (MF, ('pack', 454, 'pack'), False, None),
 'cheddar': (DE, ('pack', 227, '8-oz bag'), False, b('710212', label='Cheddar cheese')),
 'canned_tomatoes': (PA, ('pack', 411, 'can'), False, e('Tomatoes', 'Canned')),
 'feta': (DE, ('pack', 170, 'pack'), False, None),
 'wholewheat_bread': (PA, ('pack', 680, 'loaf'), False, b('702212', label='Bread, whole wheat')),
 'cottage_cheese': (DE, ('pack', 454, 'tub'), False, None),
 'almonds': (PA, ('pack', 170, 'bag'), False, None),
 'peach': (P, ('each', 150, 'peach', 'peaches'), False, e('Peaches', 'Fresh')),
 'chia': (PA, ('pack', 340, 'bag'), False, None),
 'coconut_milk': (PA, ('pack', 400, 'can'), False, None),
 'mango': (P, ('each', 200, 'mango', 'mangoes'), False, e('Mangoes', 'Fresh', 0.7)),
 'chicken_breast': (MF, ('lb',), False, b('FF1101', label='Chicken breast, boneless')),
 'white_rice': (PA, ('pack', 907, '2-lb bag'), False, b('701312', label='Rice, white, long grain')),
 'tahini': (PA, ('pack', 454, 'jar'), False, None),
 'cucumber': (P, ('each', 300, 'cucumber', 'cucumbers'), False, e('Cucumbers with peel', 'Fresh')),
 'tuna': (PA, ('pack', 113, 'can'), False, None),
 'white_beans': (PA, ('pack', 250, 'can'), False, e('Great northern beans', 'Canned', 0.6)),
 'arugula': (P, ('pack', 142, 'bag'), False, None),
 'lemon': (P, ('each', 48, 'lemon', 'lemons'), False, b('711412', 84 / 0.4536 * 4.536, 'Lemons', 1.0)),
 'deli_turkey': (MF, ('pack', 227, 'pack'), False, None),
 'avocado': (P, ('each', 136, 'avocado', 'avocados'), False, e('Avocados', 'Fresh', 0.74)),
 'lentils': (PA, ('pack', 454, 'bag'), False, e('Lentils', 'Dried')),
 'carrot': (P, ('lb',), False, e('Carrots, raw whole', 'Fresh')),
 'butternut': (P, ('each', 900, 'squash', 'squashes'), False, e('Butternut squash', 'Fresh', 0.85)),
 'onion': (P, ('each', 150, 'onion', 'onions'), False, e('Onions', 'Fresh')),
 'veg_broth': (PA, ('pack', 926, '32-oz carton'), False, None),
 'chickpeas': (PA, ('pack', 253, 'can'), False, None),
 'quinoa': (PA, ('pack', 340, 'bag'), False, None),
 'kale': (P, ('pack', 200, 'bunch'), False, e('Kale', 'Fresh')),
 'halloumi': (DE, ('pack', 225, 'block'), False, None),
 'bulgur': (PA, ('pack', 454, 'bag'), False, None),
 'mint': (P, ('pack', 30, 'bunch'), False, None),
 'shrimp': (MF, ('lb',), False, None),
 'wheat_noodles': (PA, ('pack', 340, 'pack'), False, None),
 'soy_sauce': (PA, ('pack', 296, 'bottle'), True, None),
 'bok_choy': (P, ('each', 200, 'head', 'heads'), False, None),
 'ground_beef': (MF, ('lb',), False, b('703113', label='Ground beef, lean')),
 'edamame': (PA, ('pack', 340, 'frozen bag'), False, None),
 'pita': (PA, ('pack', 360, 'pack of 6'), False, None),
 'yogurt': (DE, ('pack', 907, 'tub'), False, b('FJ4101', 226.8, 'Yogurt, per 8 oz')),
 'salmon': (MF, ('lb',), False, None),
 'sweet_potato': (P, ('each', 250, 'sweet potato', 'sweet potatoes'), False, e('Sweet potatoes', 'Fresh')),
 'broccoli': (P, ('each', 350, 'head', 'heads'), False, e('Broccoli florets', 'Fresh')),
 'kidney_beans': (PA, ('pack', 266, 'can'), False, e('Kidney beans', 'Canned', 0.6)),
 'chicken_thigh': (MF, ('lb',), False, None),
 'ground_turkey': (MF, ('lb',), False, None),
 'mushrooms': (P, ('pack', 227, 'pack'), False, e('Mushrooms, sliced', 'Fresh')),
 'green_beans': (P, ('lb',), False, e('Green beans', 'Fresh')),
 'butter': (DE, ('pack', 454, 'pack'), True, b('FS1101', label='Butter, stick')),
 'cod': (MF, ('lb',), False, None),
 'parmesan': (DE, ('pack', 142, 'wedge'), False, None),
 'pasta': (PA, ('pack', 454, 'box'), False, b('701322', label='Spaghetti and macaroni')),
 'spaghetti': (PA, ('pack', 454, 'box'), False, b('701322', label='Spaghetti and macaroni')),
 'salsa': (PA, ('pack', 454, 'jar'), False, None),
 'teriyaki': (PA, ('pack', 296, 'bottle'), False, None),
 'sesame_seeds': (SP, ('pack', 70, 'jar'), False, None),
 'pork': (MF, ('lb',), False, None),
 'cabbage': (P, ('each', 900, 'head', 'heads'), False, e('Cabbage, green', 'Fresh')),
 'vinegar': (PA, ('pack', 473, 'bottle'), True, None),
 'barley': (PA, ('pack', 454, 'bag'), False, None),
 'sour_cream': (DE, ('pack', 454, 'tub'), False, None),
 'apple': (P, ('each', 182, 'apple', 'apples'), False, e('Apples', 'Fresh')),
 'hummus': (P, ('pack', 283, 'tub'), False, None),
 'raisins': (PA, ('pack', 340, 'box'), False, e('Grapes (raisins)', 'Dried')),
 'peanuts': (PA, ('pack', 454, 'jar'), False, None),
 'grapes': (P, ('lb',), False, e('Grapes', 'Fresh')),
 'rice_cakes': (PA, ('pack', 130, 'pack'), False, None),
 'beef_jerky': (PA, ('pack', 85, 'bag'), False, None),
 'orange': (P, ('each', 131, 'orange', 'oranges'), False, b('711311', label='Oranges, navel', yield_=0.73)),
 'tomato': (P, ('each', 120, 'tomato', 'tomatoes'), False, b('712311', label='Tomatoes, field grown')),
 'garlic': (P, ('each', 50, 'head', 'heads'), False, None),
 'ginger': (P, ('each', 50, 'piece', 'pieces'), False, None),
 'chili_powder': (SP, ('pack', 70, 'jar'), True, None),
 'cumin': (SP, ('pack', 45, 'jar'), True, None),
 'paprika': (SP, ('pack', 60, 'jar'), True, None),
 'curry_powder': (SP, ('pack', 45, 'jar'), True, None),
 'oregano': (SP, ('pack', 20, 'jar'), True, None),
 'cinnamon': (SP, ('pack', 70, 'jar'), True, None),
 'salt': (SP, ('pack', 737, 'canister'), True, None),
 'pepper': (SP, ('pack', 57, 'jar'), True, None),
}
# Lemon: BLS prices whole lemons per lb; a lemon (~84 g) yields 48 g juice (USDA portion). Re-derive exactly.
v, when = bls['711412']
G['lemon'] = (P, ('each', 48, 'lemon', 'lemons'), False,
              {'per100g': round(v / LB * 84 / 48 * 100, 4), 'source': f'BLS 711412 · Lemons (84 g lemon → 48 g juice) · {when}'})

# What the item is called on a SHOPPING list (the recipe's name says how it is prepared; a list says what
# to pick up). Anything not here uses the recipe name.
SHOP = {
 'greek_yogurt': 'Greek yogurt', 'strawberries': 'Strawberries', 'sirloin': 'Sirloin steak', 'potato': 'Potatoes',
 'red_pepper': 'Red bell peppers', 'banana': 'Bananas', 'rice_milk': 'Rice milk', 'bagel': 'Bagels',
 'capers': 'Capers', 'black_beans': 'Black beans', 'flour_tortilla': 'Flour tortillas', 'flour': 'Flour',
 'milk': 'Milk', 'cheddar': 'Shredded cheddar', 'feta': 'Feta', 'cottage_cheese': 'Cottage cheese', 'peach': 'Peaches',
 'coconut_milk': 'Coconut milk', 'mango': 'Mangoes', 'chicken_breast': 'Chicken breast', 'white_rice': 'Long-grain white rice',
 'cucumber': 'Cucumbers', 'tuna': 'Canned tuna', 'white_beans': 'White beans', 'arugula': 'Arugula', 'lemon': 'Lemons',
 'deli_turkey': 'Sliced turkey', 'avocado': 'Avocados', 'lentils': 'Lentils', 'carrot': 'Carrots', 'butternut': 'Butternut squash',
 'onion': 'Onions', 'chickpeas': 'Chickpeas', 'quinoa': 'Quinoa', 'kale': 'Kale', 'bulgur': 'Bulgur', 'mint': 'Mint',
 'shrimp': 'Shrimp, peeled', 'wheat_noodles': 'Wheat noodles', 'ground_beef': 'Lean ground beef', 'edamame': 'Frozen edamame',
 'pita': 'Pita', 'yogurt': 'Plain yogurt', 'salmon': 'Salmon fillets', 'sweet_potato': 'Sweet potatoes', 'broccoli': 'Broccoli',
 'kidney_beans': 'Kidney beans', 'chicken_thigh': 'Chicken thighs', 'mushrooms': 'Mushrooms', 'cod': 'Cod fillets',
 'parmesan': 'Parmesan', 'pasta': 'Orzo', 'spaghetti': 'Spaghetti', 'pork': 'Pork tenderloin', 'cabbage': 'Cabbage',
 'barley': 'Pearl barley', 'apple': 'Apples', 'peanuts': 'Peanuts', 'boiled_egg': 'Eggs', 'rice_cakes': 'Rice cakes',
 'orange': 'Oranges', 'tomato': 'Tomatoes', 'ginger': 'Fresh ginger', 'chili_powder': 'Chilli powder', 'cumin': 'Cumin',
 'paprika': 'Smoked paprika', 'oregano': 'Dried oregano', 'cinnamon': 'Ground cinnamon', 'pepper': 'Black pepper',
 'peanut_butter': 'Peanut butter', 'oats': 'Rolled oats', 'veg_broth': 'Vegetable broth', 'spinach': 'Baby spinach',
}
# Cleaner pack names: a size belongs in the pack size, not the label.
for k, unit in {'strawberries': 'pack', 'smoked_salmon': 'pack', 'cheddar': 'bag', 'white_rice': 'bag', 'veg_broth': 'carton'}.items():
    a, buy, st, pr = G[k]
    G[k] = (a, (buy[0], buy[1], unit), st, pr)
