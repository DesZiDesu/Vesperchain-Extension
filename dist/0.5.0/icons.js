// Original, bundled vector marks. No icon CDN, emoji, or icon-font dependency.
const paths = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h2m4 0h2m-8 4h2"/>',
    weather: '<path d="M7 16a4 4 0 0 1-1-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 1 9H7Z"/>', 
    book: '<path d="M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Zm0 0v15M5 8l4 1M15 9l4-1M5 12l4 1M15 13l4-1"/>',
    castle: '<path d="M3 21V7h4V3h3v4h4V3h3v4h4v14ZM9 21v-6a3 3 0 0 1 6 0v6M6 10v2m12-2v2"/>',
    scales: '<path d="M12 3v18M7 21h10M4 6h16M6 6l-4 8h8L6 6Zm12 0-4 8h8l-4-8ZM2 14c1 4 7 4 8 0m4 0c1 4 7 4 8 0"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2ZM12 1v2m0 18v2M1 12h2m18 0h2"/>',
    gear: '<path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 3 3-1 2 3 3-1 1-3 3-1 2-3-2-2 1-3-3-3-3 1-2-3Z"/><circle cx="12" cy="11" r="3"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    moon: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
    crown: '<path d="m3 6 4 5 5-8 5 8 4-5-2 12H5L3 6Zm2 15h14"/>',
    gem: '<path d="m7 3-5 6 10 13L22 9l-5-6H7ZM2 9h20M7 3l5 19 5-19"/>',
    spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
    grip: '<circle cx="8" cy="5" r="1"/><circle cx="16" cy="5" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="19" r="1"/><circle cx="16" cy="19" r="1"/>',
};
export function icon(name) {
    return `<svg class="vc-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.book}</svg>`;
}
