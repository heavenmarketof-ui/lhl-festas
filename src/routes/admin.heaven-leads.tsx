import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchHeavenLeads, 
  updateHeavenLead, 
  deleteHeavenLead, 
  HEAVEN_LEAD_STATUSES,
  type HeavenLeadStatus
} from '@/lib/heaven-api';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  MessageSquare, 
  Trash2, 
  Calendar,
  Building2,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/admin/heaven-leads')({
  component: HeavenLeadsPage,
});

const STATUS_COLORS: Record<string, string> = {
  'Novo': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'Contatado': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'Demonstração agendada': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'Em teste': 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  'Convertido': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  'Perdido': 'bg-slate-500/10 text-slate-600 border-slate-200',
};

function HeavenLeadsPage() {
  const queryClient = useQueryClient();
  
  const { data: leads, isLoading } = useQuery({
    queryKey: ['heaven-leads'],
    queryFn: fetchHeavenLeads
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: HeavenLeadStatus }) => 
      updateHeavenLead(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heaven-leads'] });
      toast.success('Status atualizado');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHeavenLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heaven-leads'] });
      toast.success('Lead removido');
    }
  });

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${name}! Vi seu interesse na Plataforma Heaven Festas. Como posso te ajudar?`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando leads da Heaven...</div>;

  const stats = {
    total: leads?.length || 0,
    novos: leads?.filter(l => l.status === 'Novo').length || 0,
    convertidos: leads?.filter(l => l.status === 'Convertido').length || 0,
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central de Leads Heaven</h1>
          <p className="text-sm text-muted-foreground">Gestão de interessados na Plataforma Heaven Festas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Novos (Pendente)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.novos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Convertidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.convertidos}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">Data / Status</TableHead>
                <TableHead>Interessado / Empresa</TableHead>
                <TableHead>Atuação / Hoje</TableHead>
                <TableHead>Local / Contato</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads?.map((lead) => (
                <TableRow key={lead.id} className="group">
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {lead.created_at ? format(new Date(lead.created_at), "dd/MM 'às' HH:mm", { locale: ptBR }) : '-'}
                      </span>
                      <Badge variant="outline" className={`w-fit text-[10px] font-semibold ${STATUS_COLORS[lead.status || 'Novo']}`}>
                        {lead.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{lead.nome}</span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {lead.empresa}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap gap-1">
                        {lead.atuacao?.map(a => (
                          <span key={a} className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground border">
                            {a}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground italic truncate max-w-[200px]" title={lead.organizacao_hoje}>
                        Hoje: {lead.organizacao_hoje || 'Não informado'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {lead.cidade}/{lead.estado || '??'}
                      </span>
                      <span className="text-xs text-primary font-medium">{lead.whatsapp}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openWhatsApp(lead.whatsapp, lead.nome)}>
                        <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {HEAVEN_LEAD_STATUSES.map(status => (
                            <DropdownMenuItem 
                              key={status}
                              onClick={() => updateMutation.mutate({ id: lead.id!, status })}
                              className="text-xs"
                            >
                              Mudar para: {status}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive text-xs"
                            onClick={() => {
                              if(confirm('Remover este lead?')) deleteMutation.mutate(lead.id!);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir Lead
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {leads?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum lead encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
