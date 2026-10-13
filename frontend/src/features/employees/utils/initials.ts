export const initialsOf = ({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) => `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
