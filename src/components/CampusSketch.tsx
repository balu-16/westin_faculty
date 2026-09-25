import { useId } from "react";

const TREE_CROWN =
  "M44 230c-18 1-30-12-25-27-17-9-16-27-4-37-8-17-1-31 12-39-5-17 2-30 16-37-1-17 10-28 23-31 0-20 13-34 29-29 13-13 30-9 36 6 21-1 29 16 25 33 17 8 24 22 17 37 16 10 20 26 10 40 15 15 13 32 0 43 7 18-4 34-22 37-7 19-25 23-42 14-15 10-32 7-39-6-12 6-26 5-36-4Z";

/** Original academic elevation, inspired by classical architectural pen drawings. */
export function CampusSketch() {
  const id = useId();
  const windowId = `${id}-window`;
  const treeId = `${id}-tree`;
  const leafId = `${id}-leaves`;

  return (
    <svg
      className="campus-sketch"
      viewBox="0 0 840 400"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id={leafId}
          width="17"
          height="15"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="m2 5 2-2 2 1m4 7 2-3 3 1M1 13l2-1m10-9 2 1"
            stroke="currentColor"
            strokeWidth=".65"
            opacity=".33"
          />
        </pattern>
        <g id={windowId} stroke="currentColor" strokeWidth="1.1">
          <path
            d="M0 54V10Q15-5 30 10v44Z"
            fill="currentColor"
            fillOpacity=".025"
          />
          <path d="M3 52V12Q15 0 27 12v40M3 13h24M15 13v39M3 26h24M3 39h24" />
          <path d="M-3 54h36v3H-3ZM-2 10Q15-9 32 10" />
          <path d="M5 16v8m0 5v8m0 5v7" strokeWidth=".65" opacity=".6" />
        </g>
        <g
          id={treeId}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d={TREE_CROWN}
            fill="currentColor"
            fillOpacity=".022"
            strokeWidth="1.5"
          />
          <path d={TREE_CROWN} fill={`url(#${leafId})`} stroke="none" />
          {/* Unequal clusters and broken interior contours give the foliage depth. */}
          <g strokeWidth=".9" opacity=".75">
            <path d="M46 87c10-3 19 1 23 10m-36 38c13-11 27-8 31 3m-38 24c5 13 17 16 31 10m-9 34c12 3 24-3 29-15" />
            <path d="M79 43c-5 12 2 21 13 25m37-31c-9 4-14 12-12 22m-24 29c8-8 20-8 27 0m13-12c-2 14 5 24 18 28" />
            <path d="M71 104c-8 11-6 23 5 31m16-18c8 3 15 10 15 21m29-29c-11 8-11 20-3 27m22-9c-3 14 4 22 13 26" />
            <path d="M52 159c11-4 25-1 30 11m-17-24c4 3 6 8 5 14m43-9c8 0 14 5 16 13m-30 15c9-3 16 0 20 6" />
            <path d="M146 176c10 1 16 9 14 17m-34 14c11 7 24 4 29-5m-64 20c4 10 16 14 27 7m-50-12c6 0 11 3 14 8" />
          </g>
          {/* Trunk and branches taper naturally into the canopy. */}
          <path
            d="M91 309c7-19 9-41 8-62l-2-59 10-1 4 54c1 28 1 49 10 68"
            fill="currentColor"
            fillOpacity=".08"
            strokeWidth="1.4"
          />
          <path
            d="M102 240c-7-24-24-41-41-52l-9-22m48 56c-15-7-31-11-44-27m48 19c7-26 23-39 38-57l9-28"
            strokeWidth="2.1"
          />
          <path
            d="m64 190 1-29-8-15m21 55-1-25m48 5 2-28-8-14m-8 58-8-31 4-31m34 25 16 1 12-9"
            strokeWidth="1.3"
          />
          <path
            d="m102 192-8-39-11-20m11 20 10-17m-25 43-10-13m57-1 16-7m-32 66 13-16 15-3"
            strokeWidth="1"
          />
          <path
            d="M101 252c3 22 2 39-3 53m8-56c3 18 1 39 6 54M98 283l-1 13m15-18 1 16"
            strokeWidth=".7"
          />
          <path d="m91 309-14 2m44-2 14 2" strokeWidth="1.2" />
        </g>
      </defs>

      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* Main roof, parapet, chimneys, and two-storey wings. */}
        <path
          d="M162 203 196 156h448l37 47v149H162Z"
          fill="currentColor"
          fillOpacity=".022"
          strokeWidth="1.5"
        />
        <path
          d="m168 200 32-38h440l32 38M161 201h522v7H161ZM165 211h514M165 277h514M165 282h514M159 349h527v7H159Z"
          strokeWidth="1.1"
        />
        <g strokeWidth=".65" opacity=".48">
          <path d="M172 219h497M172 232h497M172 245h497M172 258h497M172 290h497M172 303h497M172 316h497M172 329h497M172 342h497" />
          <path d="m197 166 27 32m16-32 21 32m18-32 17 32m263-32-17 32m51-32-22 32m55-32-27 32" />
        </g>
        <path
          d="M236 165v-43h16v43m-18-43h20v-5h-20Zm354 43v-43h16v43m-18-43h20v-5h-20Z"
          fill="currentColor"
          fillOpacity=".025"
          strokeWidth="1.2"
        />
        <path
          d="M239 126h10m-10 5h10m-10 5h10m-10 5h10m-10 5h10m-10 5h10m-10 5h10m342-30h10m-10 5h10m-10 5h10m-10 5h10m-10 5h10m-10 5h10m-10 5h10"
          strokeWidth=".65"
        />
        {[184, 229, 274, 539, 584, 629].map((x) => (
          <g key={x}>
            <use href={`#${windowId}`} x={x} y="216" />
            <use href={`#${windowId}`} x={x} y="289" />
          </g>
        ))}

        {/* Academic clock tower, louvered cupola and slim finial. */}
        <path
          d="M393 154V92h54v62M388 92l14-17h36l14 17ZM391 91h58v5h-58ZM402 74V49q18-24 36 0v25Z"
          fill="currentColor"
          fillOpacity=".035"
          strokeWidth="1.4"
        />
        <path
          d="M399 75h42v4h-42M399 49h42M401 44q19-25 38 0M420 27V13M409 68V52q11-12 22 0v16Zm0-11h22m-22 4h22m-22 4h22M391 142h58v5h-58"
          strokeWidth="1.1"
        />
        <circle cx="420" cy="116" r="17" strokeWidth="1.3" />
        <circle cx="420" cy="116" r="14" strokeWidth=".65" />
        <path
          d="M420 103v3m0 20v3m-13-13h3m20 0h3m-22-9 2 2m14 14 2 2m-18 0 2-2m14-14 2-2M420 108v8l7 4"
          strokeWidth="1"
        />
        <circle cx="420" cy="116" r="1.6" fill="currentColor" stroke="none" />

        {/* Projecting central pavilion with a double-line triangular pediment. */}
        <path
          d="M318 201h204v147H318Z"
          fill="currentColor"
          fillOpacity=".025"
          strokeWidth="1.5"
        />
        <path
          d="m308 195 112-55 112 55-5 7H313Z"
          fill="currentColor"
          fillOpacity=".02"
          strokeWidth="1.5"
        />
        <path
          d="m321 193 99-47 99 47ZM313 202h214v8H313ZM321 213h198"
          strokeWidth="1.1"
        />
        <path
          d="M404 180c0-9 7-16 16-16s16 7 16 16M405 181h30M420 166v14m-10-9 20 8m0-8-20 8"
          strokeWidth="1"
        />
        <path d="M315 207h212m-209 2h205" strokeWidth=".7" />
        {[329, 496].map((x) => (
          <g key={x}>
            <path
              d={`M${x} 219h13v120h-13ZM${x - 3} 215h19v5h-19ZM${x - 2} 338h17v6h-17`}
              strokeWidth="1.1"
            />
            <path
              d={`M${x + 4} 224v110m5-110v110`}
              strokeWidth=".65"
              opacity=".7"
            />
          </g>
        ))}
        {[350, 405, 460].map((x) => (
          <use key={x} href={`#${windowId}`} x={x} y="217" />
        ))}
        {[350, 460].map((x) => (
          <use key={x} href={`#${windowId}`} x={x} y="289" />
        ))}
        <path d="M347 280h146M347 284h146" strokeWidth=".8" />
        {/* Recessed arched doorway, fanlight, doors, and masonry surround. */}
        <path
          d="M390 348v-39a30 30 0 0 1 60 0v39m-56 0v-39a26 26 0 0 1 52 0v39m-48 0v-38a22 22 0 0 1 44 0v38Z"
          strokeWidth="1.2"
        />
        <path
          d="M399 309h42M420 287v22m-14-17 14 17 14-17m-35 18 21-1 21 1M420 311v36M402 314h14v29h-14ZM424 314h14v29h-14Z"
          strokeWidth=".9"
        />
        <path d="m413 330 1 0m13 0 1 0" strokeWidth="2" />
        <path
          d="M386 348h68v4h-68Zm-8 4h84v4h-84Zm-9 4h102v4H369Zm-9 4h120v4H360Z"
          strokeWidth="1.1"
        />
        <path
          d="M372 351v-19l13-10v25m70 0v-25l13 10v19M372 336l13-10m70 0 13 10"
          strokeWidth="1.2"
        />
        <path d="M378 332v17m84-17v17" strokeWidth=".7" />

        {/* Framing trees, flowering borders, bench and a quiet foreground. */}
        <use href={`#${treeId}`} transform="translate(22 45) scale(.96 1)" />
        <use
          href={`#${treeId}`}
          transform="translate(814 23) scale(-.99 1.07)"
        />
        <g strokeWidth="1" opacity=".85">
          <path d="M18 353c-4-11 2-20 12-20-1-14 13-21 23-13 8-10 21-6 24 6 13-2 21 10 17 26m652 0c-3-12 4-21 14-22 0-12 10-19 21-13 8-8 19-3 20 8 13-1 20 12 15 27" />
          <path
            d="M35 352v-18m0 12-8-7m8 3 10-11m13 21-1-24m0 15-11-8m11 3 10-7m-3 21 12-14m695 14v-24m0 15-9-9m9 4 10-13m10 27-1-21m0 12-8-8m8 3 10-5"
            strokeWidth=".7"
          />
          <path d="M148 329h54v5h-54Zm0 9h54v4h-54Zm5-15v30m44-30v30m-45-8h46M169 329v-7m10 7v-7" />
          <path
            d="M152 328v-8h44v8m-39-7v7m7-7v7m7-7v7m7-7v7m7-7v7m7-7v7"
            strokeWidth=".7"
          />
          <path d="M212 352c0-8 5-13 11-11 2-9 12-11 18-5 9-6 20-1 21 7 9-1 15 3 15 9m287 0c0-8 5-13 11-11 2-9 12-11 18-5 9-6 20-1 21 7 9-1 15 3 15 9" />
        </g>
        <path
          d="M12 356h343m130 0h343M25 364h299m191 0h300"
          strokeWidth="1.2"
        />
        <path
          d="m379 366-32 26m115-26 32 26M361 380h118M48 372h35m17 4h12m40-7h35m446 1h28m29 7h42m26-7h22"
          strokeWidth=".8"
          opacity=".5"
        />
      </g>
    </svg>
  );
}

