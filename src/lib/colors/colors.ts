export enum ColorIndex {
    Red,
    Blue,
    Green,
    Yellow,
    Purple
}

export const ColorClasses: Record<ColorIndex, string> = {
    [ColorIndex.Red]: 'red-500',
    [ColorIndex.Blue]: 'blue-500',
    [ColorIndex.Green]: 'green-500',
    [ColorIndex.Yellow]: 'yellow-500',
    [ColorIndex.Purple]: 'purple-500',
};

export function getRandomColor(): ColorIndex {
    const colorValues = Object.values(ColorIndex).filter(v => typeof v === 'number') as number[];
    const randomIndex = Math.floor(Math.random() * colorValues.length);
    return colorValues[randomIndex] as ColorIndex;
}