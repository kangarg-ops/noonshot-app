    if (isNative) {
      const subkoBeans = searchedItems.filter(i => isBean(i) && !isDecaf(i));
      const decafBeans = searchedItems.filter(i => isBean(i) && isDecaf(i));
      const brandedPkg = searchedItems.filter(i => isNativeBranded(i));
      const unbrandedPkg = searchedItems.filter(i => isUnbranded(i));

      const beansIds = new Set(subkoBeans.concat(decafBeans).map(i => i.item_zsku));
      const pkgIds = new Set(brandedPkg.concat(unbrandedPkg).map(i => i.item_zsku));
      const milks = searchedItems.filter(i => !beansIds.has(i.item_zsku) && !pkgIds.has(i.item_zsku) && isMilk(i));
      const milksIds = new Set(milks.map(i => i.item_zsku));

      const ingredients = searchedItems.filter(i => !beansIds.has(i.item_zsku) && !pkgIds.has(i.item_zsku) && !milksIds.has(i.item_zsku));

      return [
        {
          id: "NATIVE_COFFEE",
          title: "☕ Coffee Beans (SUBKO Speciality Coffee - NATIVE & NICHE)",
          badge: "SUBKO Collab",
          desc: "NATIVE Blend & NICHE Blend from SUBKO (Daily limit: 1 bag/day; Niche Blend: 1–2 bags max/month).",
          items: subkoBeans,
          subsections: [
            {
              id: "NATIVE_DECAF",
              title: "🌿 Decaf Beans",
              desc: "Decaffeinated single-origin coffee (Decaf Colombia Ground).",
              items: decafBeans,
            }
          ]
        },
        {
          id: "NATIVE_MILKS",
          title: "🥛 Barista Milks",
          badge: "Dairy & Plant Milks",
          desc: "Oat milk, Almond milk & barista dairy / plant milk formulations.",
          items: milks,
          subsections: []
        },
        {
          id: "NATIVE_INGREDIENTS",
          title: "🍯 Ingredients & Essentials",
          badge: "Syrups & Essentials",
          desc: "All syrups, sauces, frappe mixes, cleaning essentials & supplies.",
          items: ingredients,
          subsections: []
        },
        {
          id: "NATIVE_BRANDED_PKG",
          title: "📦 NATIVE Branded Packaging",
          badge: "Official Native",
          desc: "Branded double-wall cups, lids, u-cups, straws, foils, stirrers & sugars.",
          items: brandedPkg,
          subsections: []
        },
        {
          id: "NATIVE_UNBRANDED_PKG",
          title: "📦 Unbranded Packaging for NATIVE (Backup)",
          badge: "Backup Stock",
          desc: "Used when NATIVE branded packaging of any type is unavailable.",
          items: unbrandedPkg,
          subsections: []
        }
      ];
    } else {
      const beans = searchedItems.filter(i => isBean(i));
      const milks = searchedItems.filter(i => isMilk(i) && !isBean(i));
      const beansIds = new Set(beans.map(i => i.item_zsku));
      const milksIds = new Set(milks.map(i => i.item_zsku));
      const ingredients = searchedItems.filter(i => !beansIds.has(i.item_zsku) && !milksIds.has(i.item_zsku));
