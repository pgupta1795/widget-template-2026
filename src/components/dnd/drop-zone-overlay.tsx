
export function DropZoneOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary bg-background/80 backdrop-blur-[1px] pointer-events-none">
      {/* <Download className="h-8 w-8 text-primary" />
      <span className="text-sm font-medium text-primary">Drop here</span> */}
      <i className='text-6xl text-gray-600 transform scale-[2] translate-x-0 translate-y-0 inline-block font-normal before:w-4 before:h-24 before:content-["+"] before:text-6xl' />
      <h5 className="font-3dsregular text-gray-600">Drop here to open</h5>
    </div>
  );
}
