export const getRedditAge = (createdAt: string) => {
  const start = new Date(createdAt);
  const now = new Date();

  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 30) return `${diffDays} d`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mo`;
  return `${Math.floor(diffDays / 365)} y`;
};
