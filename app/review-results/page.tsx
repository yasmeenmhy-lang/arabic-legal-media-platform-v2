import { redirect } from "next/navigation";

export default function ReviewResultsRedirectPage() {
  redirect("/analysis#results");
}
