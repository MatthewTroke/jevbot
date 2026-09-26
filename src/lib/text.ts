/** "1 error", "3 errors". */
export const countLabel = (count: number, singular: string, plural = `${singular}s`) =>
	`${count} ${count === 1 ? singular : plural}`;
