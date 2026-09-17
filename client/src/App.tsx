import AgeGate from "@/components/AgeGate";
import SeoHead from "@/components/SeoHead";
import AdminStudio from "@/pages/AdminStudio";
import Browse from "@/pages/Browse";
import CityGuides from "@/pages/CityGuides";
import CommunityFeed from "@/pages/CommunityFeed";
import Inbox from "@/pages/Inbox";
import ListingDetail from "@/pages/ListingDetail";
import MemberProfile from "@/pages/MemberProfile";
import PostListing from "@/pages/PostListing";
import Profile from "@/pages/Profile";
import ReportListing from "@/pages/ReportListing";
import ComponentShowcase from "@/pages/ComponentShowcase";
import SafetyCenter from "@/pages/SafetyCenter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  const [location] = useLocation();
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: "circOut" as const };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
        transition={transition}
      >
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/browse" component={Browse} />
          <Route path="/community" component={CommunityFeed} />
          <Route path="/guides" component={CityGuides} />
          <Route path="/listing/:id" component={ListingDetail} />
          <Route path="/profile" component={Profile} />
          <Route path="/member/:id" component={MemberProfile} />
          <Route path="/post" component={PostListing} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/report/listing/:id" component={ReportListing} />
          <Route path="/safety" component={SafetyCenter} />
          <Route path="/studio" component={AdminStudio} />
          <Route path="/showcase" component={ComponentShowcase} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AgeGate>
            <SeoHead />
            <Router />
          </AgeGate>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
