import { useState } from "react";
import { Link } from "wouter";
import { 
  LayoutDashboard, Users, Calendar, Settings, 
  ArrowLeft, Bell, Search, Plus, MoreVertical,
  TrendingUp, Activity, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { barbers, mockQueue } from "@/lib/data";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Mock dashboard stats
  const stats = [
    { title: "Today's Bookings", value: "24", icon: Calendar, trend: "+12%" },
    { title: "Walk-ins Today", value: "18", icon: Users, trend: "+5%" },
    { title: "Active Queue", value: mockQueue.length.toString(), icon: Activity, trend: "Live" },
    { title: "Available Barbers", value: barbers.filter(b => b.active).length.toString(), icon: CheckCircle, trend: "4 busy" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border/50 flex-shrink-0 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            <span className="font-heading font-bold tracking-tight">RK Admin</span>
          </Link>
        </div>
        
        <div className="p-4 space-y-1 flex-1">
          <Button 
            variant={activeTab === "dashboard" ? "secondary" : "ghost"} 
            className="w-full justify-start font-medium"
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </Button>
          <Button 
            variant={activeTab === "bookings" ? "secondary" : "ghost"} 
            className="w-full justify-start font-medium"
            onClick={() => setActiveTab("bookings")}
          >
            <Calendar className="mr-2 h-4 w-4" /> Bookings
          </Button>
          <Button 
            variant={activeTab === "queue" ? "secondary" : "ghost"} 
            className="w-full justify-start font-medium"
            onClick={() => setActiveTab("queue")}
          >
            <Activity className="mr-2 h-4 w-4" /> Live Queue
          </Button>
          <Button 
            variant={activeTab === "barbers" ? "secondary" : "ghost"} 
            className="w-full justify-start font-medium"
            onClick={() => setActiveTab("barbers")}
          >
            <Users className="mr-2 h-4 w-4" /> Barbers
          </Button>
        </div>
        
        <div className="p-4 border-t border-border/50">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border/50 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <div className="md:hidden flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <span className="font-heading font-bold">RK Admin</span>
          </div>
          
          <div className="flex-1 max-w-md hidden md:flex items-center relative">
            <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
            <Input 
              placeholder="Search bookings, customers..." 
              className="pl-9 bg-muted/50 border-none w-full"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <span className="text-sm font-bold text-primary">AD</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-muted/10">
          {activeTab === "dashboard" && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">Dashboard Overview</h1>
                <p className="text-muted-foreground">Monitor your shop's performance for today.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-card p-5 rounded-2xl border border-border/50 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <stat.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                        {stat.trend.includes('+') && <TrendingUp className="w-3 h-3" />}
                        {stat.trend}
                      </span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                ))}
              </div>

              {/* Recent Bookings Table */}
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden mt-8">
                <div className="p-5 border-b border-border/50 flex justify-between items-center bg-muted/20">
                  <h2 className="font-semibold text-lg">Upcoming Appointments</h2>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead>Customer</TableHead>
                        <TableHead>Barber</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { name: "Alex Santos", barber: "Abu", time: "10:30 AM", type: "Reservation", status: "Confirmed" },
                        { name: "Miguel Reyes", barber: "JP", time: "11:00 AM", type: "Walk-in", status: "Waiting" },
                        { name: "Joshua Lim", barber: "Jaymar", time: "11:30 AM", type: "Reservation", status: "Pending" },
                      ].map((b, i) => (
                        <TableRow key={i} className="border-border/50">
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell>{b.barber}</TableCell>
                          <TableCell>{b.time}</TableCell>
                          <TableCell>
                            <Badge variant={b.type === "Reservation" ? "default" : "secondary"}>
                              {b.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              b.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-500' :
                              b.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-blue-500/10 text-blue-500'
                            }`}>
                              {b.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {activeTab !== "dashboard" && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <Settings className="w-10 h-10 text-muted-foreground opacity-50" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h2>
              <p className="text-muted-foreground mb-6">
                This module is part of the full administrative dashboard. In this MVP mockup, only the Dashboard Overview is fully styled.
              </p>
              <Button onClick={() => setActiveTab("dashboard")}>Return to Dashboard</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}