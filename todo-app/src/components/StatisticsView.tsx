import React, { useEffect, useState } from 'react';
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTodoStore } from '../store/todoStore';
import { StatsData, Priority } from '../db';

// 간단한 차트 컴포넌트 (막대 그래프)
function BarChart({ data, maxValue, colorClass }: { 
  data: { label: string; value: number }[];
  maxValue: number;
  colorClass?: string;
}) {
  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`${colorClass || 'bg-primary'} h-2 rounded-full`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 도넛 차트 컴포넌트
function DonutChart({ data }: { 
  data: { label: string; value: number; color: string }[] 
}) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let cumulativePercent = 0;

  // SVG를 위한 데이터 준비
  const segments = data.map(item => {
    const percent = total === 0 ? 0 : (item.value / total) * 100;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    
    return {
      ...item,
      percent,
      startPercent,
      endPercent: cumulativePercent
    };
  });

  return (
    <div className="relative w-full aspect-square max-w-[200px] mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {segments.map((segment, i) => {
          // 원형 호를 만들기 위한 값 계산
          const startAngle = segment.startPercent * 3.6; // 360 / 100 = 3.6
          const endAngle = segment.endPercent * 3.6;
          
          // SVG 호 그리기 (원점은 50,50이고 반지름은 40)
          const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
          const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
          const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
          const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
          
          // 큰 호인지 작은 호인지 결정 (180도 이상이면 큰 호)
          const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
          
          return (
            <path
              key={i}
              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
              fill={segment.color}
              stroke="#fff"
              strokeWidth="1"
            />
          );
        })}
        <circle cx="50" cy="50" r="30" fill="white" /> {/* 가운데 구멍 */}
      </svg>
      
      {/* 차트 중앙에 표시할 총합 */}
      <div className="absolute inset-0 flex items-center justify-center text-center">
        <div>
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
      </div>
    </div>
  );
}

export function StatisticsView() {
  const { todos, stats, loadData } = useTodoStore();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // 기간별 통계
  const getPeriodStats = () => {
    const today = new Date();
    let startDate: Date;
    
    switch(period) {
      case 'day':
        startDate = startOfDay(today);
        break;
      case 'week':
        startDate = subDays(today, 7);
        break;
      case 'month':
        startDate = subDays(today, 30);
        break;
      default:
        startDate = subDays(today, 7);
    }
    
    return stats.filter(stat => new Date(stat.date) >= startDate);
  };
  
  const periodStats = getPeriodStats();
  
  // 완료된 작업 vs 전체 작업
  const completedTotal = periodStats.reduce((sum, stat) => sum + stat.completedCount, 0);
  const tasksTotal = periodStats.reduce((sum, stat) => sum + stat.totalCount, 0);
  const completionRate = tasksTotal > 0 ? (completedTotal / tasksTotal) * 100 : 0;
  
  // 날짜별 완료 작업 차트 데이터
  const dailyCompletions = periodStats.map(stat => ({
    label: format(new Date(stat.date), 'MM/dd'),
    value: stat.completedCount
  }));
  
  // 카테고리별 통계
  const categoryStats: Record<string, { completed: number; total: number; name: string }> = {};
  
  // 모든 카테고리 정보 취합
  periodStats.forEach(stat => {
    Object.entries(stat.categoryStats).forEach(([categoryId, data]) => {
      if (!categoryStats[categoryId]) {
        categoryStats[categoryId] = { 
          completed: 0, 
          total: 0, 
          name: categoryId // 임시로 ID 사용
        };
      }
      
      categoryStats[categoryId].completed += data.completed;
      categoryStats[categoryId].total += data.total;
    });
  });
  
  // 태그별 통계
  const tagStats: Record<string, { completed: number; total: number }> = {};
  
  // 모든 태그 정보 취합
  periodStats.forEach(stat => {
    Object.entries(stat.tagStats).forEach(([tag, data]) => {
      if (!tagStats[tag]) {
        tagStats[tag] = { completed: 0, total: 0 };
      }
      
      tagStats[tag].completed += data.completed;
      tagStats[tag].total += data.total;
    });
  });
  
  // 현재 할 일 목록 기반 통계
  const activeTodos = todos.filter(todo => !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);
  
  // 우선순위별 할 일 통계
  const priorityStats = {
    [Priority.HIGH]: todos.filter(todo => todo.priority === Priority.HIGH).length,
    [Priority.MEDIUM]: todos.filter(todo => todo.priority === Priority.MEDIUM).length,
    [Priority.LOW]: todos.filter(todo => todo.priority === Priority.LOW).length,
  };
  
  // 우선순위 도넛 차트 데이터
  const priorityChartData = [
    { label: '높음', value: priorityStats[Priority.HIGH], color: '#EF4444' },
    { label: '중간', value: priorityStats[Priority.MEDIUM], color: '#F59E0B' },
    { label: '낮음', value: priorityStats[Priority.LOW], color: '#10B981' },
  ];
  
  // 완료/미완료 도넛 차트 데이터
  const completionChartData = [
    { label: '완료', value: completedTodos.length, color: '#3B82F6' },
    { label: '미완료', value: activeTodos.length, color: '#9CA3AF' },
  ];
  
  // 가장 많이 사용된 태그 (최대 5개)
  const topTags = Object.entries(tagStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([tag, data]) => ({
      label: tag,
      value: data.total
    }));
  
  // 현재 미완료 작업 중 마감 기한이 가장 빠른 작업들 (최대 5개)
  const upcomingDeadlines = activeTodos
    .filter(todo => todo.dueDate)
    .sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 5);
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">통계 및 분석</h2>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm rounded-md ${period === 'day' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            onClick={() => setPeriod('day')}
          >
            오늘
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${period === 'week' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            onClick={() => setPeriod('week')}
          >
            주간
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${period === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            onClick={() => setPeriod('month')}
          >
            월간
          </button>
        </div>
      </div>
      
      {/* 상단 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-background border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">할 일 현황</h3>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-3xl font-bold">{activeTodos.length}</div>
              <div className="text-sm text-muted-foreground">활성 작업</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{completedTodos.length}</div>
              <div className="text-sm text-muted-foreground">완료됨</div>
            </div>
          </div>
        </div>
        
        <div className="bg-background border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">완료율</h3>
          <div className="text-3xl font-bold">{completionRate.toFixed(1)}%</div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {completedTotal} / {tasksTotal} 작업 완료
          </div>
        </div>
        
        <div className="bg-background border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">우선순위 분포</h3>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm">{priorityStats[Priority.HIGH]} 높음</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-sm">{priorityStats[Priority.MEDIUM]} 중간</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm">{priorityStats[Priority.LOW]} 낮음</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 차트 및 그래프 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 일별 완료 작업 그래프 */}
        <div className="bg-background border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium mb-4">일별 완료 작업</h3>
          <BarChart 
            data={dailyCompletions} 
            maxValue={Math.max(...dailyCompletions.map(d => d.value), 1)}
            colorClass="bg-blue-500"
          />
        </div>
        
        {/* 우선순위 분포 도넛 차트 */}
        <div className="bg-background border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium mb-4">우선순위 분포</h3>
          <DonutChart data={priorityChartData} />
          <div className="flex justify-center space-x-4 mt-4">
            {priorityChartData.map((item, i) => (
              <div key={i} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-1" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 태그 통계 */}
        <div className="bg-background border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium mb-4">가장 많이 사용된 태그</h3>
          {topTags.length > 0 ? (
            <BarChart 
              data={topTags} 
              maxValue={Math.max(...topTags.map(t => t.value), 1)}
              colorClass="bg-purple-500"
            />
          ) : (
            <p className="text-sm text-muted-foreground">태그 데이터가 없습니다.</p>
          )}
        </div>
        
        {/* 다가오는 마감일 */}
        <div className="bg-background border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium mb-4">다가오는 마감일</h3>
          {upcomingDeadlines.length > 0 ? (
            <div className="space-y-2">
              {upcomingDeadlines.map((todo, index) => (
                <div key={index} className="flex justify-between items-center p-2 border-b">
                  <div className="flex-1">
                    <div className="text-sm font-medium truncate">{todo.text}</div>
                    <div className="text-xs text-muted-foreground">
                      {todo.dueDate && format(new Date(todo.dueDate), 'yyyy년 MM월 dd일', { locale: ko })}
                    </div>
                  </div>
                  <div 
                    className={`px-2 py-1 text-xs rounded-full ${
                      todo.priority === Priority.HIGH ? 'bg-red-100 text-red-800' : 
                      todo.priority === Priority.MEDIUM ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'
                    }`}
                  >
                    {todo.priority === Priority.HIGH ? '높음' : 
                     todo.priority === Priority.MEDIUM ? '중간' : '낮음'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">다가오는 마감일이 없습니다.</p>
          )}
        </div>
      </div>
      
      {/* 진행 중인 작업 */}
      <div className="bg-background border rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-medium mb-4">진행 중인 작업</h3>
        <div className="space-y-4">
          {activeTodos
            .filter(todo => todo.timeTracking?.started && !todo.timeTracking?.stopped)
            .map((todo, index) => {
              // 현재 진행 시간 계산
              let totalSeconds = 0;
              if (todo.timeTracking?.totalTime) {
                totalSeconds = Math.floor(todo.timeTracking.totalTime / 1000);
              }
              
              // 현재 세션 추가
              if (todo.timeTracking?.started) {
                const now = new Date();
                const started = new Date(todo.timeTracking.started);
                const additionalSeconds = Math.floor((now.getTime() - started.getTime()) / 1000);
                totalSeconds += additionalSeconds;
              }
              
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const formattedTime = `${hours}시간 ${minutes}분`;
              
              return (
                <div key={index} className="flex justify-between items-center p-3 border rounded-md">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{todo.text}</div>
                    <div className="text-xs text-muted-foreground">
                      시작: {todo.timeTracking?.started && 
                        format(new Date(todo.timeTracking.started), 'HH:mm', { locale: ko })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formattedTime}</div>
                    <div className="text-xs text-green-500">진행 중</div>
                  </div>
                </div>
              );
            })}
            
            {activeTodos.filter(todo => todo.timeTracking?.started && !todo.timeTracking?.stopped).length === 0 && (
              <p className="text-sm text-muted-foreground">현재 진행 중인 작업이 없습니다.</p>
            )}
        </div>
      </div>
    </div>
  );
}