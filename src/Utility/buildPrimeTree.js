export function buildPrimeTree(schemas) {
  return schemas.map((schema, sIndex) => ({
    key: `schema-${sIndex}`,
    label: schema.title,
    icon: "pi pi-folder",
    type: "schema",           // 👈 important
    children: schema.tables.map((table, tIndex) => ({
      key: `schema-${sIndex}-table-${tIndex}`,
      label: table.table,
      icon: "pi pi-database",
      type: "table",
      children: table.columns.map((col, cIndex) => ({
        key: `schema-${sIndex}-table-${tIndex}-col-${cIndex}`,
        label: col.name,
        icon: "pi pi-tag",
        type: "column",
        data: { data_type: col.data_type },
        leaf: true
      }))
    }))
  }));
}
