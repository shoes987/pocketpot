import React from "react";

export async function generateStaticParams() {
  return [{ pupilId: "demo" }];
}

export default function PupilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
