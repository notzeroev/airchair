import { LayoutProvider } from "@/context/LayoutProvider";
import { Header } from "@/components/header";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <Header />
      {children}
    </LayoutProvider>
  );
}