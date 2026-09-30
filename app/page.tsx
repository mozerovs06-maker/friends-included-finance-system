import { FinanceApp } from "@/components/finance-app";
import { publicConfig } from "@/lib/config";

export default function Page() {
  return <FinanceApp config={publicConfig} />;
}
