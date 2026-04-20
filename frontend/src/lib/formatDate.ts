export const formatDate = (dateString: string) => {
  if (!dateString) return '';

  const date = new Date(dateString);

  // const formattedDate = new Date(date).toLocaleDateString('en-US', {
  //   month: 'long',
  //   day: 'numeric',
  //   year: 'numeric',
  // });

  const datePart = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Используем 24-часовой формат. Если хочешь AM/PM — поставь true
  });

  // return formattedDate;
  return `${datePart} at ${timePart}`;
};
