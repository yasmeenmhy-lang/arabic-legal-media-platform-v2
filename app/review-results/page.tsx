import { redirect } from "next/navigation";

export default function ReviewResultsRedirectPage() {
  redirect("/content-review#results");
}
