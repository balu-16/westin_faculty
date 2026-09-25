import { useId } from "react";
import "./StudentMascot.css";

export interface StudentMascotProps {
  pulling?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

/** Original side-profile illustration, layered from far limbs to near limbs. */
export function StudentMascot({
  pulling = false,
  reducedMotion = false,
  className = "",
}: StudentMascotProps = {}) {
  const id = useId();
  return (
    <svg
      className={`wm-mascot${pulling ? " wm-pulling" : ""}${reducedMotion ? " wm-reduced-motion" : ""} ${className}`}
      viewBox="0 0 280 360"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={`${id}-shirt`}
          x1="94"
          y1="118"
          x2="160"
          y2="213"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#94D3EF" />
          <stop offset="1" stopColor="#5AA9D1" />
        </linearGradient>
        <linearGradient
          id={`${id}-bag`}
          x1="46"
          y1="133"
          x2="93"
          y2="214"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F79B53" />
          <stop offset="1" stopColor="#E7773C" />
        </linearGradient>
        <linearGradient
          id={`${id}-skin`}
          x1="108"
          y1="61"
          x2="153"
          y2="110"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#DCA373" />
          <stop offset="1" stopColor="#C68A5C" />
        </linearGradient>
      </defs>
      <ellipse cx="137" cy="341" rx="100" ry="6" fill="#3C7398" opacity=".12" />
      <g className="wm-student" strokeLinejoin="round" strokeLinecap="round">
        {/* Far leg: a bent knee leads into a nearly vertical shin. */}
        <g data-mascot-part="far-leg">
          <path
            d="M127 207 150 211 179 250Q187 260 187 275L186 312 165 315 160 277 137 253 118 229Z"
            fill="#203650"
          />
          <path d="m147 231 26 32 3 36" stroke="#304B69" strokeWidth="4" />
          <path d="m169 272 9-3" stroke="#142C46" strokeWidth="2" />
          <path d="m164 304 22-2 1 11-22 3Z" fill="#152C47" />
          <path d="m165 312 20-2 2 11-22 2Z" fill="#E5EFF2" />
          <path d="m171 315 10-1" stroke="#CADCE3" strokeWidth="1.4" />
          {/* Both soles are horizontal, with both toes pointing towards the card. */}
          <path
            d="m163 319 10-4 12 1 7 7 19 4c8 2 13 6 13 11h-66c-3-6-1-13 5-19Z"
            fill="#FFFDF5"
            stroke="#BCD1DC"
            strokeWidth="1.1"
          />
          <path d="m160 323 9-3 9 9-19 2Z" fill="#C5DFEB" />
          <path d="m184 318 12 7-16 6-8-12Z" fill="#E5EFF3" />
          <path
            d="m181 322 9 3m-5 1 9 2m-5 1 9 2"
            stroke="#6B90A4"
            strokeWidth="1.7"
          />
          <path d="M157 335c22 2 46 2 67 0v5h-66Z" fill="#DBE7EB" />
          <path d="M161 340h61" stroke="#8FAEBF" strokeWidth="1.3" />
        </g>
        {/* Near leg: continuous hip–knee–ankle line, extended behind for traction. */}
        <g data-mascot-part="near-leg">
          <path
            d="M101 204 143 212 131 241 119 267 86 316 63 309 96 251 95 226Z"
            fill="#2B4564"
          />
          <path
            d="M110 222c-1 13-3 25-8 35l-28 47"
            stroke="#3C5977"
            strokeWidth="4"
          />
          <path d="m116 242-7 21-11 11" stroke="#223B58" strokeWidth="2" />
          <path d="m67 301 23 11-5 9-23-11Z" fill="#1C3553" />
          <path d="m65 309 19 8-4 10-20-8Z" fill="#E8F0F3" />
          <path d="m66 315 13 5" stroke="#CBDEE6" strokeWidth="1.4" />
          <path
            d="m59 318 11-2 11 6 8 3 18 3c7 1 12 5 13 10H52c-3-5-1-14 7-20Z"
            fill="#FFFDF5"
            stroke="#BCD1DC"
            strokeWidth="1.1"
          />
          <path d="m56 321 10-1 7 9-20 2Z" fill="#C5DFEB" />
          <path d="m74 320 16 6-15 7-9-12Z" fill="#E5EFF3" />
          <path
            d="m75 324 9 2m-5 1 9 2m-5 1 9 2"
            stroke="#6B90A4"
            strokeWidth="1.7"
          />
          <path d="M51 335c21 2 49 2 69 0v5H52Z" fill="#DBE7EB" />
          <path d="M55 340h63" stroke="#8FAEBF" strokeWidth="1.3" />
          <path
            d="M98 203c18 2 33 6 53 4l3 13c-18 7-40 0-58-2Z"
            fill="#2B4564"
          />
          <path d="m109 216 16 3" stroke="#3C5977" strokeWidth="1.5" />
        </g>
        <g className="wm-upper-body">
          {/* The pack sits behind the torso; the shoulder strap reconnects at its base. */}
          <g data-mascot-part="backpack">
            <path
              d="M80 124c-15-5-27 7-31 24l-10 48c-3 15 3 23 17 27l27 6c12 2 19-5 21-18l10-62c2-12-8-20-21-22Z"
              fill="#BD5D32"
            />
            <path
              d="M75 126c-14 0-22 10-25 24l-10 46c-3 13 2 20 13 23l24 5c9 2 15-4 18-16l12-61c2-10-5-15-16-18Z"
              fill={`url(#${id}-bag)`}
            />
            <path
              d="M79 129c10 2 14 7 12 17l-11 60c-1 7-5 11-10 13"
              stroke="#FFBB78"
              strokeWidth="1.6"
            />
            <path
              d="M62 135c5-6 12-8 18-5"
              stroke="#FFCA8D"
              strokeWidth="2.5"
            />
            <path
              d="m47 177 31 7-5 26c-1 6-5 8-11 7l-16-4c-7-2-9-7-7-13Z"
              fill="#F6A364"
              stroke="#D47742"
              strokeWidth="1.2"
            />
            <path d="m46 184 27 6" stroke="#B46137" strokeWidth="1.6" />
            <path d="m69 190-1 5" stroke="#FFE0AE" strokeWidth="2.1" />
            <path d="m44 207 24 6" stroke="#FFBE80" strokeWidth="1.2" />
            <path d="m91 172 10 2-5 30-8-2Z" fill="#B65C36" />
            <path d="m95 177 4 1" stroke="#E69C63" strokeWidth="1.5" />
            <path
              d="M74 127c1-10 5-14 12-12 6 2 8 7 7 14"
              stroke="#A45533"
              strokeWidth="4"
            />
            <path d="M76 124c2-7 5-9 9-7" stroke="#EC9E63" strokeWidth="1.5" />
          </g>
          {/* The far forearm is underneath its sleeve, not painted over the cuff. */}
          <g data-mascot-part="far-arm">
            <path
              d="m148 137 24 19 38-17 8 13-42 21c-6 3-10 1-15-3l-25-22Z"
              fill="#B87B52"
            />
            <path d="m173 162 34-15" stroke="#D3996A" strokeWidth="3" />
            <path
              d="m208 140 8-8c3-3 6-1 7 2l2 3 8-1c5-1 8 3 7 8l-2 6c-1 4-5 6-9 4l-11-4-5 2Z"
              fill="#BC8056"
            />
            <path
              d="m225 140 9 2m-10 3 9 2"
              stroke="#985F42"
              strokeWidth="1.5"
            />
            <path
              d="M132 115c11 0 22 10 32 22l-16 18-20-17c-6-7-5-16 4-23Z"
              fill="#64ADD2"
            />
            <path d="m147 150 13-14 4 3-15 16Z" fill="#B9E3F3" />
            <path d="m148 152 13-13" stroke="#4488B3" strokeWidth="1" />
          </g>
          <path d="m113 94 24-1 3 25-14 12-19-10Z" fill="#C38A5C" />
          <path d="m113 97 24-2 1 13c-8 5-17 4-24-2Z" fill="#AD724D" />
          {/* Closed, tucked-in school shirt with a continuous front panel. */}
          <g data-mascot-part="shirt">
            <path
              d="M102 115 112 112l15 9 11-8c12 15 13 38 15 59l4 37c-21 6-41 3-59-2l-9-49c-4-22-1-35 13-43Z"
              fill={`url(#${id}-shirt)`}
            />
            <path
              d="M102 123c-8 18-5 43 1 65l4 21-9-2-9-49c-3-17-2-28 5-36Z"
              fill="#4E9DC7"
              opacity=".65"
            />
            <path d="m129 127 12 81" stroke="#4D96BE" strokeWidth="2" />
            <path d="m132 130 11 77" stroke="#A8DCF0" strokeWidth="3" />
            <path
              d="m112 111 15 10-9 15-15-17Z"
              fill="#C3E8F7"
              stroke="#5CA2C8"
              strokeWidth=".8"
            />
            <path
              d="m138 111-11 10 11 12 6-11Z"
              fill="#DAF0FA"
              stroke="#5CA2C8"
              strokeWidth=".8"
            />
            <path d="m123 125 4-4 4 7" fill="#EDF8FC" />
            <path
              d="m142 145 8 1 1 12-5 3-3-4Z"
              fill="#7EC2E2"
              stroke="#4D98C2"
              strokeWidth="1"
            />
            <path d="m143 149 7 1" stroke="#B5E1F1" strokeWidth="1" />
            <circle cx="135" cy="148" r="1.2" fill="#EFF8FB" />
            <circle cx="138" cy="173" r="1.2" fill="#EFF8FB" />
            <circle cx="142" cy="198" r="1.2" fill="#EFF8FB" />
            <path
              d="m100 184 9 19m33-13 9 11"
              stroke="#4D98C2"
              strokeWidth="1.7"
            />
            <path
              d="M100 206c16 4 34 6 55 2"
              stroke="#4087B1"
              strokeWidth="1.2"
            />
          </g>
          {/* The near strap is occluded by the sleeve, then visible below the arm. */}
          <g data-mascot-part="backpack-strap">
            <path
              d="M85 132c1-15 10-22 19-14 9 9 12 34 12 55l-1 20c-1 12-7 17-18 17"
              stroke="#95523B"
              strokeWidth="9"
            />
            <path
              d="M85 132c1-15 10-22 19-14 9 9 12 34 12 55l-1 20c-1 12-7 17-18 17"
              stroke="#DB854B"
              strokeWidth="6"
            />
            <path
              d="M87 129c2-12 8-17 15-10"
              stroke="#F9BD7C"
              strokeWidth="1.5"
            />
            <path d="m111 184 9 1-1 12-9-1Z" fill="#355065" />
            <path d="m113 187 4 .4-.4 6-4-.4Z" fill="#E7B485" />
          </g>
          <g data-mascot-part="near-arm">
            <path
              d="m124 146 28 23 62-22 7 14-65 25c-6 2-10 0-14-4l-31-25Z"
              fill="#D19A6B"
            />
            <path d="m146 177 6 2 57-21" stroke="#E5B587" strokeWidth="3.4" />
            <path d="m151 184 62-23" stroke="#B98058" strokeWidth="1.1" />
            {/* The sleeve overlaps the proximal upper arm, including the cuff seam. */}
            <path
              d="M101 124c10-5 20 0 27 9l14 17-22 21-19-22c-7-9-8-20 0-25Z"
              fill="#91CFEA"
            />
            <path
              d="M104 128c6-2 14 2 19 8l11 14"
              stroke="#B6E2F3"
              strokeWidth="2.5"
            />
            <path d="m117 165 21-20 5 6-22 21Z" fill="#CEEAF6" />
            <path d="m120 169 20-19" stroke="#599DBF" strokeWidth="1.2" />
            <path d="m110 154 4 5" stroke="#6CB4D8" strokeWidth="1.4" />
            {/* Curled fingers and one thumb; the rope exits at the outside knuckles. */}
            <path
              d="m210 149 9-8c3-2 5-2 7 1l2 4 9-1c5 0 8 4 7 8l-2 7c-1 5-6 7-11 5l-10-4-6 1Z"
              fill="#D19A6B"
            />
            <path
              d="m218 149 8 5c3 2 6 0 5-3l-5-9"
              fill="#DFAC7D"
              stroke="#B37A53"
              strokeWidth="1.2"
            />
            <path
              d="m229 151 10 2m-12 3 11 3m-10 1 8 3"
              stroke="#AD7450"
              strokeWidth="1.4"
            />
            <path d="m233 147 5 1" stroke="#EDC19A" strokeWidth="1.7" />
            <circle data-rope-grip="" cx="241" cy="151" r="1" opacity="0" />
          </g>
          <g data-mascot-part="head">
            <path
              d="M104 47c14-12 37-9 47 5 5 7 4 17 7 25l7 10c2 3-1 5-7 6-2 15-12 23-25 20-15-3-24-13-26-27l-7-18Z"
              fill={`url(#${id}-skin)`}
            />
            <path
              d="M146 60c2 9 1 16 5 23l7 7-2 10c-3 10-10 14-19 13 8-4 10-11 9-19l-4-17Z"
              fill="#E0AA79"
            />
            <ellipse
              cx="146"
              cy="92"
              rx="6"
              ry="3.5"
              fill="#DF9976"
              opacity=".55"
            />
            <path d="M141 72c4-3 8-2 10 0" stroke="#283A4B" strokeWidth="2.3" />
            <ellipse cx="149" cy="80" rx="2.1" ry="3.1" fill="#203046" />
            <circle cx="149.6" cy="79.2" r=".65" fill="#FFFDF5" />
            <path d="m158 90-4 1" stroke="#B37954" strokeWidth="1.2" />
            <path
              d="M142 100c4 3 9 2 12-1"
              stroke="#86543C"
              strokeWidth="1.8"
            />
            <path d="m144 100 8-.5c-3 2-5 3-8 .5Z" fill="#FFF5DF" />
            <path
              d="M107 89c-8-1-12-9-12-17-8-5-10-13-7-20 1-8 8-13 15-15 5-10 16-14 25-10 9-6 20-3 25 5 12 0 19 8 16 16-3 9-13 12-26 10-4 6-13 8-20 5 0 9-2 15-10 20Z"
              fill="#1D3048"
            />
            <path
              d="M96 51c7-9 12-7 18-10 8-5 14-7 22-2m-28 17c10 3 18 1 23-4"
              stroke="#354D66"
              strokeWidth="4.3"
            />
            <path d="M112 81c-7-9-17-5-15 3 1 8 8 12 14 9Z" fill="#D5A074" />
            <path d="M103 83c4-2 6 1 5 5" stroke="#AD7450" strokeWidth="1.9" />
            <path d="m109 97 4 4" stroke="#BA8057" strokeWidth="1.1" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export default StudentMascot;

