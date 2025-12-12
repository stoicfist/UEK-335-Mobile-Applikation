import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonSelect, IonSelectOption, IonCard, IonCardHeader, IonCardTitle, IonGrid, IonRow, IonCol, IonItem, IonLabel } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TourService, Tour } from '../services/tour.service';
import Chart from 'chart.js/auto';
import { ThemeService } from '../services/theme.service';

// 'chart.js/auto' registers controllers/plugins automatically

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
  @ViewChild('radarChart') radarChartRef!: ElementRef<HTMLCanvasElement>;

  tours: Tour[] = [];
  years: number[] = [];
  selectedYear: number = new Date().getFullYear();

  kpi: KPI = { totalDistanceKm: 0, totalHours: 0, tourCount: 0, maxAvgSpeed: 0 };

  private barChart?: Chart;
  private lineChart?: Chart;
  private radarChart?: Chart;

  private themeSub: any;
  private themeRebuildTimer?: any;

  constructor(private tourService: TourService, private themeService: ThemeService) {}

  async ngAfterViewInit(): Promise<void> {
    await this.ensureDataLoaded();
    this.computeKpis(this.selectedYear);
    this.safeRenderAll();

    // react on theme changes
    // call updateChartColors asynchronously to avoid synchronous re-render race with view init
    this.themeSub = this.themeService.darkMode$.subscribe(() => {
      this.scheduleThemeRebuild();
    });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.ensureDataLoaded();
    this.computeKpis(this.selectedYear);
    // Immer frisch aufbauen, um zerstörte Instanzen nach Navigationswechseln sicher zu ersetzen
    this.destroyCharts();
    this.safeRenderAll();
  }

  ionViewDidLeave(): void {
    this.destroyCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    if (this.themeSub && typeof this.themeSub.unsubscribe === 'function') this.themeSub.unsubscribe();
    if (this.themeRebuildTimer) clearTimeout(this.themeRebuildTimer);
  }

  private async ensureDataLoaded(): Promise<void> {
    if (!this.tours.length) {
      await this.loadTours();
      this.initYears();
    }
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
    this.computeKpis(this.selectedYear);
    this.updateCharts();
  }

  private computeKpis(year?: number): void {
    const filtered = this.filterToursByYear(year);
    const totalDistance = filtered.reduce((s: number, t: Tour) => s + (t.distance || 0), 0);
    const totalSeconds = filtered.reduce((s: number, t: Tour) => s + (t.duration || 0), 0);
    const tourCount = filtered.length;
    const maxAvg = filtered.reduce((m: number, t: Tour) => Math.max(m, t.avg_speed || 0), 0);

    this.kpi = {
      totalDistanceKm: parseFloat(totalDistance.toFixed(2)),
      totalHours: parseFloat((totalSeconds/3600).toFixed(2)),
      tourCount,
      maxAvgSpeed: parseFloat(maxAvg.toFixed(2)),
    };
  }

  private filterToursByYear(year?: number): Tour[] {
    if (!year) return this.tours;
    return this.tours.filter((t: Tour) => {
      const y = t.year || new Date(t.created_at || '').getFullYear();
      return y === year;
    });
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

  private speedsSeries(year?: number): {labels: string[], data: number[]} {
    // Use only tours for the given year (if provided)
    const list = year ? this.filterToursByYear(year) : this.tours;
    // Sort chronologically by created_at ascending
    const sorted = [...list].sort((a,b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
    const labels = sorted.map(t => t.created_at ? new Date(t.created_at).toLocaleDateString() : '');
    const data = sorted.map(t => parseFloat((t.avg_speed || 0).toFixed(2)));
    return { labels, data };
  }

  private renderCharts(): void {
    this.renderBarChart();
    this.renderLineChart();
  }

  /** Render charts safely after a short delay to allow DOM to attach canvases */
  private safeRenderAll(): void {
    setTimeout(() => {
      try {
        this.renderRadarChart();
        this.renderCharts();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Tab3: chart render retry after failure', e);
        setTimeout(() => {
          this.renderRadarChart();
          this.renderCharts();
        }, 300);
      }
    }, 200);
  }

  /** Render or update the radar (spider) chart placed at the top of the page */
  private renderRadarChart(): void {
    // ensure canvas is available and attached to document; if not, retry shortly
    if (!this.radarChartRef || !this.radarChartRef.nativeElement || !document.contains(this.radarChartRef.nativeElement)) {
      // retry shortly — avoids Chart.js errors when element not yet in DOM
      setTimeout(() => this.renderRadarChart(), 100);
      return;
    }
    const ctx = this.radarChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = ['Total Distance', 'Total Trip Time', 'Average Speed', 'Max Avg Speed', 'Tour Count', 'Avg Tour Distance'];

    // compute raw values based on currently selected year
    const filtered = this.filterToursByYear(this.selectedYear);
    const totalDistance = filtered.reduce((s: number, t: Tour) => s + (t.distance || 0), 0);
    const totalSeconds = filtered.reduce((s: number, t: Tour) => s + (t.duration || 0), 0);
    const totalHours = totalSeconds / 3600;
    const avgSpeed = filtered.length ? (filtered.reduce((s: number, t: Tour) => s + (t.avg_speed || 0), 0) / filtered.length) : 0;
    const maxAvg = filtered.reduce((m: number, t: Tour) => Math.max(m, t.avg_speed || 0), 0);
    const tourCount = filtered.length;
    const avgDistance = tourCount ? totalDistance / tourCount : 0;

    const rawValues = [totalDistance, parseFloat(totalHours.toFixed(2)), parseFloat(avgSpeed.toFixed(2)), parseFloat(maxAvg.toFixed(2)), tourCount, parseFloat(avgDistance.toFixed(2))];

    // normalization constants
    const maxExpected = {
      distance: 500,
      time: 20,
      speed: 120,
      tourCount: 20,
      avgDistance: 100
    };

    const normalized = [
      Math.min(100, (rawValues[0] / maxExpected.distance) * 100),
      Math.min(100, (rawValues[1] / maxExpected.time) * 100),
      Math.min(100, (rawValues[2] / maxExpected.speed) * 100),
      Math.min(100, (rawValues[3] / maxExpected.speed) * 100),
      Math.min(100, (rawValues[4] / maxExpected.tourCount) * 100),
      Math.min(100, (rawValues[5] / maxExpected.avgDistance) * 100),
    ];

  const isDark = this.themeService.isDarkMode();
  // pick theme-aware colors; use primary-ish blue for light, light/greenish for dark for visibility
  const border = this.getColor('rgba(54,162,235,0.95)');
  const bg = this.getColor('rgba(54,162,235,0.12)');
  const textColor = isDark ? '#e6ffed' : '#222';


    // tooltip callbacks close over rawValues so they can show real numbers
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx: any) {
              const i = ctx.dataIndex;
              const raw = rawValues[i];
              switch (i) {
                case 0: return `${raw} km`;
                case 1: return `${raw} h`;
                case 2: return `${raw} km/h`;
                case 3: return `${raw} km/h`;
                case 4: return `${raw}`;
                case 5: return `${raw} km`;
                default: return `${raw}`;
              }
            }
          }
        }
      },
      scales: {
        r: {
          // hide numeric tick labels in the center (100,80,...) — unnecessary UI element
          ticks: { display: false, color: textColor, stepSize: 20 },
          pointLabels: { color: textColor, font: { size: 12 } },
          grid: { color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
          angleLines: { color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
          suggestedMin: 0,
          suggestedMax: 100
        }
      }
    };

    if (this.radarChart) {
      (this.radarChart.data.datasets[0].data as number[]) = normalized;
      this.radarChart.update();
      return;
    }

    this.radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          data: normalized,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 2,
          pointBackgroundColor: border,
          pointRadius: 3,
          fill: true
        }]
      },
      options
    });
  }

  private renderBarChart(): void {
    // ensure canvas exists and is attached
    if (!this.barChartRef || !this.barChartRef.nativeElement || !document.contains(this.barChartRef.nativeElement)) {
      setTimeout(() => this.renderBarChart(), 100);
      return;
    }
    const ctx = this.barChartRef.nativeElement.getContext('2d');
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
    // ensure canvas exists and attached to DOM
    if (!this.lineChartRef || !this.lineChartRef.nativeElement || !document.contains(this.lineChartRef.nativeElement)) {
      setTimeout(() => this.renderLineChart(), 100);
      return;
    }
    const ctx = this.lineChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    const series = this.speedsSeries(this.selectedYear);

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
      const series = this.speedsSeries(this.selectedYear);
      this.lineChart.data.labels = series.labels;
      (this.lineChart.data.datasets[0].data as number[]) = series.data;
      this.lineChart.update();
    }
    // update radar
    this.renderRadarChart();
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
    this.destroyCharts();
    this.safeRenderAll();
  }

  private destroyCharts(): void {
    this.barChart?.destroy();
    this.lineChart?.destroy();
    this.radarChart?.destroy();
    this.barChart = undefined;
    this.lineChart = undefined;
    this.radarChart = undefined;
  }

  private scheduleThemeRebuild(): void {
    if (this.themeRebuildTimer) clearTimeout(this.themeRebuildTimer);
    // Warte kurz, damit der Layout-Switch (Dark/Light) durch ist, bevor wir neu rendern
    this.themeRebuildTimer = setTimeout(() => {
      this.destroyCharts();
      this.safeRenderAll();
    }, 180);
  }

}
