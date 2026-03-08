export const SUBMITTED_USER_REPORT_FIELDS = [
  { key: "name", label: "Submitted User Name" },
  { key: "email", label: "Submitted User Email" },
  { key: "contactNumber", label: "Submitted User Contact Number" },
  { key: "address", label: "Submitted User Address" }
] as const;

type SubmissionUserLike = {
  user?: {
    email?: string | null;
    fullName?: string | null;
    contactNumber?: string | null;
    profile?: {
      displayName?: string | null;
      fullAddress?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
    } | null;
  } | null;
};

const resolveAddress = (submission: SubmissionUserLike): string => {
  const profile = submission.user?.profile;
  const fullAddress = profile?.fullAddress?.trim();
  if (fullAddress) return fullAddress;

  const parts = [profile?.addressLine1, profile?.addressLine2, profile?.city]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part.length > 0);

  return parts.join(", ");
};

export const resolveSubmittedUserValue = (
  submission: SubmissionUserLike,
  key: (typeof SUBMITTED_USER_REPORT_FIELDS)[number]["key"]
): string => {
  if (key === "name") {
    return (
      submission.user?.profile?.displayName?.trim() ||
      submission.user?.fullName?.trim() ||
      ""
    );
  }
  if (key === "email") {
    return submission.user?.email?.trim() || "";
  }
  if (key === "contactNumber") {
    return submission.user?.contactNumber?.trim() || "";
  }
  return resolveAddress(submission);
};
