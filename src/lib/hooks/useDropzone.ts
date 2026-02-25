// import { useEffect, useState } from 'react';

// const PROTOCOL = '3DXContent';

// function getDroppedIds(data: string) {
//   const dnd = JSON.parse(data);
//   if (dnd.protocol !== PROTOCOL) console.warn(`This is not a 3DXContent`);
//   const droppedObjIds = dnd.data.items
//     .filter(
//       (item: { objectType: string }) =>
//         item.objectType === preference_Type.get()
//     )
//     .map((item: { objectId: string }) => item.objectId);
//   console.log(`Dropped Id: ${droppedObjIds}`);
//   return droppedObjIds;
// }

// function useDropzone(elementId: string) {
//   const navigate = useNavigate();
//   const element = document.querySelector(elementId);
//   const [isDragging, setIsDragging] = useState(false);
//   const { saveRoute } = useRouteStorage(true);

//   useEffect(() => {
//     (async () => {
//       const { serviceCaller } = await getAPI();
//       if (element) {
//         serviceCaller?.dashboardServices?.DataDragAndDrop?.droppable(element, {
//           drop: (data: string) => {
//             console.log(`Dropped Element: ${data}`);
//             setIsDragging(false);
//             const droppedObjIds = getDroppedIds(data);
//             if (droppedObjIds.length === 1) {
//               const toPath = getObjectpath(droppedObjIds[0]);
//               saveRoute(toPath);
//               navigate(toPath);
//             }
//           },
//           enter: () => {
//             console.log('entering dropzone');
//             setIsDragging(true);
//           },
//           leave: () => {
//             console.log('leaving dropzone');
//           },
//           over: () => {
//             console.log('Over dropzone');
//           },
//         });
//       }
//     })();

//     return () => {};
//   }, [element, elementId, navigate, saveRoute]);

//   useEffect(() => {
//     if (isDragging)
//       element?.classList.add(
//         'border-primary',
//         'border-dashed',
//         'border-4',
//         'rounded-sm'
//       );

//     return () => {
//       element?.classList.remove(
//         'border-primary',
//         'border-dashed',
//         'border-4',
//         'rounded-sm'
//       );
//     };
//   }, [element?.classList, elementId, isDragging]);

//   return { isDragging };
// }

// export default useDropzone;
