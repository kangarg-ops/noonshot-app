    if (isNative) {
      const subkoBeans = searchedItems.filter(i => isBean(i) && !isDecaf(i));
      const decafBeans = searchedItems.filter(i => isBean(i) && isDecaf(i));
      const brandedPkg = searchedItems.filter(i => isNativeBranded(i));
      const unbrandedPkg = searchedItems.filter(i => isUnbranded(i));
      const beansAccounted = new Set([...subkoBeans.map(i => i.item_zsku), ...decafBeans.map(i => i.item_zsku)]);
      const pkgAccounted = new Set([...brandedPkg.map(i => i.item_zsku), ...unbrandedPkg.map(i => i.item_zsku)]);
      
      const milks = searchedItems.filter(i => !beansAccounted.has(i.item_zsku) && !pkgAccounted.has(i.item_zsku) && isMilk(i));

      const accounted = new Set([
        ...beansAccounted,
        ...pkgAccounted,
        ...milks.map(i => i.item_zsku),
      ]);
      const ingredients = searchedItems.filter(i => !accounted.has(i.item_zsku));

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
    }
