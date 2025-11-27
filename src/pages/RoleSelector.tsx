import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Briefcase, Users, LogOut } from 'lucide-react';

export default function RoleSelector() {
  const { userRoles, selectRole, signOut, user } = useAuth();

  const roleConfig = {
    admin: {
      title: 'Administrator',
      description: 'Administrer brukere, ansatte og barn',
      icon: Shield,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      hoverColor: 'hover:border-destructive/50 hover:bg-destructive/5',
    },
    employee: {
      title: 'Ansatt',
      description: 'Registrer henting og sjekk barn inn/ut',
      icon: Briefcase,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      hoverColor: 'hover:border-primary/50 hover:bg-primary/5',
    },
    parent: {
      title: 'Forelder',
      description: 'Se barnas status og administrer hentere',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      hoverColor: 'hover:border-green-500/50 hover:bg-green-50',
    },
  };

  const handleRoleSelect = (role: 'admin' | 'employee' | 'parent') => {
    selectRole(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Krysselista</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Velg din rolle</h2>
            <p className="text-muted-foreground">
              Du har tilgang til flere roller. Velg hvilken du vil bruke nå.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {userRoles.map((role) => {
              const config = roleConfig[role];
              const Icon = config.icon;

              return (
                <Card
                  key={role}
                  className={`cursor-pointer transition-all duration-200 border-2 ${config.hoverColor}`}
                  onClick={() => handleRoleSelect(role)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${config.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{config.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {config.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
