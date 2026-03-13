export function useColumnResize() {
  const tableOptions = {
    columnResizeMode: "onChange" as const,
    enableColumnResizing: true,
    columnResizeDirection: "ltr" as const,
  }

  return { tableOptions }
}
