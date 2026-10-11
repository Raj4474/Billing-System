import { getSettingsAction } from "@/actions/invoices";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const settings = await getSettingsAction();

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Company details that appear on every invoice
        </p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
