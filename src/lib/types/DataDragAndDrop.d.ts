// -----------------------------------------------------
// DS/DataDragAndDrop/DataDragAndDrop
// Docs: module-DS_DataDragAndDrop_DataDragAndDrop
// -----------------------------------------------------

export interface DataDragAndDropDraggableOptions {
	/** Arbitrary string data carried by the drag. */
	data?: string;
	/** Called when drag starts. */
	start?(element: Element, event: DragEvent): void;
	/** Called when drag ends. */
	stop?(element: Element, event: DragEvent): void;
}

export interface DataDragAndDropDroppableOptions {
	/** Called when a drag enters the droppable element. */
	enter?(element: Element, event: DragEvent): void;
	/** Called when a drag leaves the droppable element. */
	leave?(element: Element, event: DragEvent): void;
	/**
	 * Called while drag hovers the element (mouse moves).
	 * If returns false, `drop` will not be called.
	 */
	over?(element: Element, event: DragEvent): boolean | undefined;
	/**
	 * Called when a drop occurs.
	 * `dataTransfer` is the event.dataTransfer.
	 */
	drop?(
		dataTransfer: DataTransfer | null,
		element: Element,
		event: DragEvent,
	): void;
}

export interface DataDragAndDropOnOptions
	extends DataDragAndDropDraggableOptions,
		DataDragAndDropDroppableOptions {}

export interface DataDragAndDrop {
	/**
	 * Remove drag/drop events added by draggable/droppable/on.
	 * If type is 'drop' or 'drag', only remove that part; otherwise both.
	 */
	clean(element: Element, type?: "drop" | "drag"): void;

	/**
	 * Make element draggable.
	 */
	draggable(element: Element, options: DataDragAndDropDraggableOptions): void;

	/**
	 * Make element droppable.
	 */
	droppable(element: Element, options: DataDragAndDropDroppableOptions): void;

	/**
	 * Remove drag/drop events from the provided element lists.
	 */
	off(dragElements: Element[], dropElements: Element[]): void;

	/**
	 * Set both drag and drop for given element lists.
	 */
	on(
		dragElements: Element[],
		dropElements: Element[],
		options: DataDragAndDropOnOptions,
	): void;
}
