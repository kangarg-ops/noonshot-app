    } else {
      const beans = searchedItems.filter(i => isBean(i));
      const milks = searchedItems.filter(i => isMilk(i) && !isBean(i));
      const beansIds = new Set(beans.map(i => i.item_zsku));
      const milksIds = new Set(milks.map(i => i.item_zsku));
      const ingredients = searchedItems.filter(i => !beansIds.has(i.item_zsku) && !milksIds.has(i.item_zsku));

      return [
        {
          id: "SHOT_COFFEE",
          title: "☕ Coffee Beans (All Three)",
          badge: "3 Signature Roasts",
          desc: "Noon Minutes Blend (Signature), Ethiopian Medium Roast & Colombian Decaf.",
          items: beans,
          subsections: []
        },
        {
          id: "SHOT_MILKS",
          title: "🥛 Barista Milks",
          badge: "Dairy & Plant Milks",
          desc: "Oat milk, Almond milk & barista dairy / plant milk formulations.",
          items: milks,
          subsections: []
        },
        {
          id: "SHOT_INGREDIENTS",
          title: "🍯 Ingredients, Packaging & Disposables",
          badge: "Ingredients & Supplies",
          desc: "All syrups, sauces, frappe powders, coconut cream, chai, matcha, cups, lids, packaging, cleaning liquids & essentials.",
          items: ingredients,
          subsections: []
        }
      ];
    }
