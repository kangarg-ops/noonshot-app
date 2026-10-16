    const isIsiCharger = (i: any) => {
      const t = (i.product_title || "").toLowerCase();
      const sku = (i.item_zsku || "").toLowerCase();
      const b = (i.brand || "").toLowerCase();
      return (
        t.includes("charger") ||
        t.includes("isi ") ||
        t.startsWith("isi") ||
        b.includes("isi") ||
        sku.includes("charger") ||
        sku.includes("isi") ||
        t.includes("n2o") ||
        t.includes("whipper")
      );
    };

    const isMilk = (i: any) => {
      if (isIsiCharger(i)) return false;
      const t = (i.product_title || "").toLowerCase();
      if (
        t.includes("clean") || t.includes("everclean") || t.includes("ball") ||
        t.includes("liquid") || t.includes("cream") || t.includes("tablet") ||
        t.includes("descal") || t.includes("powder") || t.includes("syrup") || t.includes("sauce")
      ) return false;
      return t.includes("milk") || t.includes("oat") || t.includes("almond") || t.includes("dairy") || t.includes("soy");
    };

    const isBean = (i: any) => {
      if (isIsiCharger(i)) return false;
      const t = (i.product_title || "").toLowerCase();
      const cat = (i.category || "").toUpperCase();
      const b = (i.brand || "").toLowerCase();
      if (t.includes("cleaning") || t.includes("clean") || t.includes("cup") || t.includes("lid") || t.includes("straw") || t.includes("syrup") || t.includes("sauce")) return false;
      return (
        cat === "COFFEE_BEANS" ||
        isSubkoBean(i) ||
        b.includes("subko") ||
        t.includes("subko") ||
        t.includes("blend") ||
        t.includes("roast") ||
        t.includes("decaf") ||
        t.includes("coffee bean")
      );
    };

    const isDecaf = (i: any) => (i.product_title || "").toLowerCase().includes("decaf");

    const isUnbranded = (i: any) => {
      if (isIsiCharger(i)) return false;
      if (isBean(i) || isSubkoBean(i) || isMilk(i)) return false;
      const cat = (i.category || "").toUpperCase();
      if (cat === "COFFEE_BEANS" || cat === "INGREDIENTS" || cat === "MILK") return false;
      const t = (i.product_title || "").toLowerCase();
      const b = (i.barcode || "").toUpperCase();
      return t.includes("unbranded") || b.startsWith("UBNAT");
    };

    const isNativeBranded = (i: any) => {
      if (isIsiCharger(i)) return false;
      if (isBean(i) || isSubkoBean(i)) return false;
      if (isMilk(i)) return false;
      if (isUnbranded(i)) return false;

      const cat = (i.category || "").toUpperCase();
      if (cat === "COFFEE_BEANS" || cat === "INGREDIENTS" || cat === "MILK") return false;

      const t = (i.product_title || "").toLowerCase();
      const b = (i.barcode || "").toUpperCase();

      if (t.includes("bean") || t.includes("roast") || t.includes("subko") || t.includes("decaf") || t.includes("blend") || t.includes("charger") || t.includes("isi")) return false;

      const isPkgTitle =
        t.includes("cup") || t.includes("lid") || t.includes("straw") || t.includes("foil") ||
        t.includes("napkin") || t.includes("sugar") || t.includes("sweetener") || t.includes("stirrers") ||
        t.includes("sleeve") || t.includes("carrier") || t.includes("box") || (t.includes("bag") && !t.includes("coffee"));

      return (
        cat === "PACKAGING" ||
        b.startsWith("NAT") ||
        isPkgTitle ||
        ((i.item_type === "NATIVE_ONLY" || i.brand === "native") && isPkgTitle)
      );
    };
