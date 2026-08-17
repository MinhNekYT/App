import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import type { ComponentType } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { PageLoader } from "./components/PageLoader";
import CreateVm from "./pages/CreateVm";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import VmInstances from "./pages/VmInstances";
import VmLogs from "./pages/VmLogs";

function Protected({ component: Component }: { component: ComponentType }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/vm-instances"><Protected component={VmInstances} /></Route>
      <Route path="/vm-instances/new"><Protected component={CreateVm} /></Route>
      <Route path="/vm-instances/:id/logs"><Protected component={VmLogs} /></Route>
      <Route path="/settings"><Protected component={Settings} /></Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
