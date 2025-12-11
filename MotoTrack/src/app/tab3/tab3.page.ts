import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonSelect, IonSelectOption, IonCard, IonCardHeader, IonCardTitle, IonGrid, IonRow, IonCol, IonItem, IonLabel } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TourService, Tour } from '../services/tour.service';
import { Chart, registerables } from 'chart.js';
import { ThemeService } from '../services/theme.service';

Chart.register(...registerables);

interface KPI {
  totalDistanceKm: number;
  totalHours: number;
  tourCount: number;
  maxAvgSpeed: number;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonSelect, IonSelectOption, IonCard, IonCardHeader, IonCardTitle, IonGrid, IonRow, IonCol, IonItem, IonLabel],
})
export class Tab3Page implements AfterViewInit, OnDestroy {
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;

  tours: Tour[] = [];
  years: number[] = [];
  selectedYear: number = new Date().getFullYear();

  kpi: KPI = { totalDistanceKm: 0, totalHours: 0, tourCount: 0, maxAvgSpeed: 0 };

  private barChart?: Chart;
  private lineChart?: Chart;

  private themeSub: any;

  constructor(private tourService: TourService, private themeService: ThemeService) {}

  async ngAfterViewInit(): Promise<void> {
    await this.loadTours();
    this.initYears();
    this.computeKpis();
    this.renderCharts();

    // react on theme changes
    this.themeSub = this.themeService.darkMode$.subscribe(() => {
      // re-render charts for theme
      this.updateChartColors();
    });
  }

  ngOnDestroy(): void {
    this.barChart?.destroy();
    this.lineChart?.destroy();
    if (this.themeSub && typeof this.themeSub.unsubscribe === 'function') this.themeSub.unsubscribe();
  }

  private async loadTours(): Promise<void> {
    this.tours = await this.tourService.getAllTours();
  }

  private initYears(): void {
    const yearsSet = new Set<number>();
    this.tours.forEach(t => yearsSet.add(t.year || new Date(t.created_at || '').getFullYear()));
    const arr = Array.from(yearsSet).sort((a,b) => b-a);
    const current = new Date().getFullYear();
    if (!arr.includes(current)) arr.unshift(current);
    this.years = arr;
    if (!this.selectedYear && this.years.length) this.selectedYear = this.years[0];
  }

  onYearChanged(year: number): void {
    this.selectedYear = year;
    this.updateCharts();
  }

  private computeKpis(): void {
    const totalDistance = this.tours.reduce((s, t) => s + (t.distance || 0), 0);
    const totalSeconds = this.tours.reduce((s, t) => s + (t.duration || 0), 0);
    const tourCount = this.tours.length;
    const maxAvg = this.tours.reduce((m, t) => Math.max(m, t.avg_speed || 0), 0);

    this.kpi = {
      totalDistanceKm: parseFloat(totalDistance.toFixed(2)),
      totalHours: parseFloat((totalSeconds/3600).toFixed(2)),
      tourCount,
      maxAvgSpeed: parseFloat(maxAvg.toFixed(2)),
    };
  }

  private aggregateDistanceByMonth(year: number): number[] {
    const months = new Array(12).fill(0);
    this.tours.forEach(t => {
      const y = t.year || new Date(t.created_at || '').getFullYear();
      const m = t.month || (new Date(t.created_at || '').getMonth()+1);
      if (y === year) months[m-1] += (t.distance || 0);
    });
    return months.map(v => parseFloat(v.toFixed(2)));
  }

  private speedsSeries(): {labels: string[], data: number[]} {
    // Sort chronologically by created_at ascending
    const sorted = [...this.tours].sort((a,b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
    const labels = sorted.map(t => t.created_at ? new Date(t.created_at).toLocaleDateString() : '');
    const data = sorted.map(t => parseFloat((t.avg_speed || 0).toFixed(2)));
    return { labels, data };
  }

  private renderCharts(): void {
    this.renderBarChart();
    this.renderLineChart();
  }

  private renderBarChart(): void {
    const ctx = this.barChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;
    const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    const data = this.aggregateDistanceByMonth(this.selectedYear);

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{ label: 'Kilometer', data, backgroundColor: this.getColor('rgba(54,162,235,0.8)'), borderRadius: 6 }]
      },
      options: this.baseOptions('Distanz pro Monat (km)')
    });
  }

  private renderLineChart(): void {
    const ctx = this.lineChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;
    const series = this.speedsSeries();

    this.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.labels,
        datasets: [{ label: 'Ø Geschwindigkeit (km/h)', data: series.data, fill: false, borderColor: this.getColor('rgba(255,99,132,0.9)'), tension: 0.2 }]
      },
      options: this.baseOptions('Durchschnittsgeschwindigkeit pro Tour', true)
    });
  }

  private updateCharts(): void {
    // update bar
    if (this.barChart) {
      (this.barChart.data.datasets[0].data as number[]) = this.aggregateDistanceByMonth(this.selectedYear);
      this.barChart.update();
    }
    // update line (no filtering)
    if (this.lineChart) {
      const series = this.speedsSeries();
      this.lineChart.data.labels = series.labels;
      (this.lineChart.data.datasets[0].data as number[]) = series.data;
      this.lineChart.update();
    }
  }

  private baseOptions(titleText: string, showTooltipByIndex = false) {
    const isDark = this.themeService.isDarkMode();
    const textColor = isDark ? '#eee' : '#222';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } },
        title: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              return `${ctx.dataset.label}: ${ctx.formattedValue}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    };
  }

  private getColor(base: string) {
    // adjust for dark mode if needed
    if (this.themeService.isDarkMode()) {
      // return lighter variant
      return base.replace('0.8', '0.95').replace('0.9','0.95');
    }
    return base;
  }

  private updateChartColors(): void {
    // Recreate charts to apply theme colors simply
    this.barChart?.destroy();
    this.lineChart?.destroy();
    this.renderCharts();
  }

}
