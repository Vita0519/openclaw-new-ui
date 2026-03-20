"use client";
import { useEffect, useState } from "react";
import { useGateway } from "@/context/gateway-context";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, RefreshCw, Cpu, Box, Fingerprint, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentsPage() {
  const { client, connected } = useGateway();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [agentsList, setAgentsList] = useState<any>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const fetchAgents = async () => {
    if (!client || !connected) return;
    setLoading(true);
    try {
      const res = await client.request("agents.list");
      setAgentsList(res);
      if (!selectedAgentId && res?.agents?.length > 0) {
        setSelectedAgentId(res.defaultId || res.agents[0].id);
      }
    } catch (err: any) {
      toast({
        title: "无法获取代理列表",
        description: err.message || "请求 agents.list 失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [client, connected]);

  const agents = agentsList?.agents || [];
  const selectedAgent = agents.find((a: any) => a.id === selectedAgentId);

  return (
    <div className="flex flex-col md:flex-row h-full p-3 sm:p-6 gap-3 sm:gap-6 max-w-7xl mx-auto animate-in fade-in duration-300 overflow-hidden text-foreground">
      {/* Sidebar: Agents List */}
      <Card className={cn(
        "w-full md:w-80 flex flex-col shrink-0 border-border/50 shadow-sm overflow-hidden bg-background/50 backdrop-blur-sm",
        selectedAgentId && "hidden md:flex"
      )}>
        <div className="p-3 sm:p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="font-bold tracking-tight text-sm sm:text-base">智能代理列表</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{agents.length} 个配置单元</p>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchAgents} disabled={loading} className="size-8 rounded-full">
            <RefreshCw className={cn("size-3.5 sm:size-4 text-muted-foreground", loading && "animate-spin")} />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 sm:space-y-2 custom-scrollbar">
          {agents.length === 0 && !loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              暂无代理节点
            </div>
          ) : (
             agents.map((agent: any) => {
               const isSelected = selectedAgentId === agent.id;
               const isDefault = agentsList?.defaultId === agent.id;
               const title = agent.identity?.name || agent.name || agent.id;
               const subtitle = agent.identity?.theme || "Agent workspace";
               
               return (
                 <button
                   key={agent.id}
                   onClick={() => setSelectedAgentId(agent.id)}
                   className={cn(
                     "w-full flex items-start gap-2.5 sm:gap-4 p-2 sm:p-3 rounded-xl transition-all text-left border border-transparent",
                     isSelected 
                       ? "bg-primary/10 border-primary/20 shadow-sm"
                       : "hover:bg-muted/50"
                   )}
                 >
                   <div className={cn(
                     "size-8 sm:size-10 rounded-full flex items-center justify-center shrink-0 border",
                     isSelected ? "bg-primary text-primary-foreground border-primary/20" : "bg-muted border-border/50"
                   )}>
                     <Bot className="size-4 sm:size-5" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-1.5 sm:gap-2">
                       <span className={cn("font-semibold truncate text-[12px] sm:text-sm", isSelected ? "text-primary" : "text-foreground")}>{title}</span>
                       {isDefault && (
                         <span className="px-1 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20 shrink-0">Def</span>
                       )}
                     </div>
                     <p className="text-[10px] sm:text-xs text-muted-foreground truncate opacity-80 mt-0.5">{subtitle}</p>
                   </div>
                 </button>
               );
             })
          )}
        </div>
      </Card>

      {/* Main Area: Agent Details */}
      <div className={cn(
          "flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar md:pr-1",
          !selectedAgentId && "hidden md:block"
      )}>
        {!selectedAgent ? (
           <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-muted/10 p-6">
             <Bot className="size-16 mb-4 opacity-20" />
             <p className="text-sm text-center">请在左侧选择一个智能代理以查看详情</p>
           </div>
        ) : (
           <div className="h-full flex flex-col space-y-2.5 sm:space-y-6 animate-in slide-in-from-right-4 duration-300">
             {selectedAgentId && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedAgentId(null)} className="md:hidden w-fit h-6 text-[10px] px-1 gap-1 -ml-1 text-muted-foreground font-semibold">
                    <ChevronLeft className="size-3.5" />
                    返回列表
                </Button>
             )}
             
             <Card className="p-3 sm:p-6 border-border/50 shadow-sm bg-gradient-to-br from-background to-muted/20 relative overflow-hidden rounded-xl sm:rounded-2xl">
                <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-20 pointer-events-none" />
                
                <div className="flex items-center sm:items-start gap-3 sm:gap-5 relative z-10">
                  <div className="size-10 sm:size-16 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20 shrink-0 border border-primary/50">
                    <Bot className="size-5 sm:size-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                       <h1 className="text-base sm:text-2xl font-bold tracking-tight truncate">{selectedAgent.identity?.name || selectedAgent.name || selectedAgent.id}</h1>
                       {agentsList?.defaultId === selectedAgent.id && (
                          <span className="sm:hidden inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-orange-500/10 text-orange-600 border border-orange-500/20">默认</span>
                       )}
                    </div>
                    <p className="hidden sm:block text-sm text-muted-foreground mt-1 truncate">{selectedAgent.identity?.theme || "Agent workspace and routing."}</p>
                    <div className="flex items-center gap-2 mt-1 sm:mt-3">
                      <span className="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-xs font-mono font-medium bg-muted border border-border/50 text-foreground">
                        {selectedAgent.id}
                      </span>
                      {agentsList?.defaultId === selectedAgent.id && (
                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20">
                          默认代理
                        </span>
                      )}
                    </div>
                  </div>
                </div>
             </Card>
             
             <div className="flex-1 min-h-0 flex flex-col">
               <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                 <TabsList className="w-full justify-start bg-transparent border-b border-border/50 rounded-none h-8 sm:h-12 p-0 space-x-4 sm:space-x-6">
                   <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-1 sm:py-3 px-1 text-[11px] sm:text-sm font-medium">概览</TabsTrigger>
                   <TabsTrigger value="files" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-1 sm:py-3 px-1 text-[11px] sm:text-sm font-medium">配置</TabsTrigger>
                   <TabsTrigger value="tools" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-1 sm:py-3 px-1 text-[11px] sm:text-sm font-medium">工具</TabsTrigger>
                   <TabsTrigger value="skills" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-1 sm:py-3 px-1 text-[11px] sm:text-sm font-medium">技能</TabsTrigger>
                 </TabsList>
                 
                 <TabsContent value="overview" className="flex-1 mt-3 sm:mt-6 space-y-3 sm:space-y-6 focus-visible:outline-none">
                    <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
                      <Card className="p-2 sm:p-5 border-border/50 space-y-1 sm:space-y-4 hover:border-primary/20 transition-colors bg-background/50 rounded-lg sm:rounded-xl flex flex-col items-center sm:items-start">
                         <div className="flex items-center gap-1.5 text-primary">
                           <Fingerprint className="size-3 sm:size-4" />
                           <h3 className="font-semibold text-[8px] sm:text-sm text-foreground uppercase tracking-tighter sm:tracking-wider">身份</h3>
                         </div>
                         <div className="text-[9px] sm:text-sm truncate w-full text-center sm:text-left">{selectedAgent.identity?.name || selectedAgent.name}</div>
                      </Card>
                      <Card className="p-2 sm:p-5 border-border/50 space-y-1 sm:space-y-4 hover:border-primary/20 transition-colors bg-background/50 rounded-lg sm:rounded-xl flex flex-col items-center sm:items-start">
                         <div className="flex items-center gap-1.5 text-blue-500">
                           <Cpu className="size-3 sm:size-4" />
                           <h3 className="font-semibold text-[8px] sm:text-sm text-foreground uppercase tracking-tighter sm:tracking-wider">级别</h3>
                         </div>
                         <div className="text-[9px] sm:text-sm truncate w-full text-center sm:text-left">{selectedAgent.scope === "isolated" ? "独立" : "完全"}</div>
                      </Card>
                      <Card className="p-2 sm:p-5 border-border/50 space-y-1 sm:space-y-4 hover:border-primary/20 transition-colors bg-background/50 rounded-lg sm:rounded-xl flex flex-col items-center sm:items-start">
                         <div className="flex items-center gap-1.5 text-green-500">
                           <Box className="size-3 sm:size-4" />
                           <h3 className="font-semibold text-[8px] sm:text-sm text-foreground uppercase tracking-tighter sm:tracking-wider">网关</h3>
                         </div>
                         <div className="text-[9px] sm:text-sm font-mono text-muted-foreground truncate w-full text-center sm:text-left">{agentsList?.mainKey || "N/A"}</div>
                      </Card>
                    </div>
                    <Card className="p-3 sm:p-6 border-border/50 border-dashed bg-muted/10 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[80px] sm:min-h-[150px] rounded-lg">
                      <p className="text-[10px] sm:text-sm">模型选择器/路由规则组装中</p>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="files" className="flex-1 mt-3 sm:mt-6 focus-visible:outline-none">
                    <Card className="p-4 sm:p-12 border-border/50 border-dashed bg-muted/10 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[150px] sm:min-h-[300px] rounded-lg">
                      <Box className="size-5 sm:size-8 opacity-20 mb-2" />
                      <p className="text-[10px] sm:text-sm font-medium text-center">配置与提示词修改开发中</p>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="tools" className="flex-1 mt-3 sm:mt-6 focus-visible:outline-none">
                    <Card className="p-4 sm:p-12 border-border/50 border-dashed bg-muted/10 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[150px] sm:min-h-[300px] rounded-lg">
                      <Cpu className="size-5 sm:size-8 opacity-20 mb-2" />
                      <p className="text-[10px] sm:text-sm font-medium text-center">专属工具面板开发中</p>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="skills" className="flex-1 mt-3 sm:mt-6 focus-visible:outline-none">
                    <Card className="p-4 sm:p-12 border-border/50 border-dashed bg-muted/10 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[150px] sm:min-h-[300px] rounded-lg">
                      <Fingerprint className="size-5 sm:size-8 opacity-20 mb-2" />
                      <p className="text-[10px] sm:text-sm font-medium text-center">专属技能库开发中</p>
                    </Card>
                  </TabsContent>
               </Tabs>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
