export enum ColorIndex {
    Red,
    Blue,
    Green,
    Yellow,
    Purple
}

export const ColorClasses: Record<ColorIndex, string> = {
    [ColorIndex.Red]: 'bg-red-500',
    [ColorIndex.Blue]: 'bg-blue-500',
    [ColorIndex.Green]: 'bg-green-500',
    [ColorIndex.Yellow]: 'bg-yellow-500',
    [ColorIndex.Purple]: 'bg-purple-500',
};

export function getRandomColor(): ColorIndex {
    const colorValues = Object.values(ColorIndex).filter(v => typeof v === 'number') as number[];
    const randomIndex = Math.floor(Math.random() * colorValues.length);
    return colorValues[randomIndex] as ColorIndex;
}