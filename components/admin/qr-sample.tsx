// Decorative stand-in drawn in the design. Not a scannable code: the real QR
// image arrives with the QR slice (spec section 9, slice 5).
export function QrSample() {
  return (
    <svg
      width={132}
      height={132}
      viewBox="0 0 96 96"
      aria-hidden="true"
      className="flex-none rounded-xl border border-line bg-white p-2"
    >
      <g fill="none" stroke="#11141A" strokeWidth={5}>
        <rect x={8} y={8} width={26} height={26} />
        <rect x={62} y={8} width={26} height={26} />
        <rect x={8} y={62} width={26} height={26} />
      </g>
      <g fill="#11141A">
        <rect x={16} y={16} width={10} height={10} />
        <rect x={70} y={16} width={10} height={10} />
        <rect x={16} y={70} width={10} height={10} />
        <rect x={42} y={10} width={8} height={8} />
        <rect x={42} y={26} width={8} height={8} />
        <rect x={10} y={42} width={8} height={8} />
        <rect x={26} y={42} width={8} height={8} />
        <rect x={42} y={42} width={8} height={8} />
        <rect x={58} y={42} width={8} height={8} />
        <rect x={74} y={42} width={8} height={8} />
        <rect x={42} y={58} width={8} height={8} />
        <rect x={58} y={66} width={8} height={8} />
        <rect x={74} y={58} width={8} height={8} />
        <rect x={42} y={74} width={8} height={8} />
        <rect x={74} y={76} width={8} height={8} />
      </g>
    </svg>
  );
}
