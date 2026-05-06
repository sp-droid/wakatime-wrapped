// ============================================
    // STATE MANAGEMENT
    // ============================================
    let appState = {
      userData: null,
      transformedData: null,
      selectedYear: null,
      currentSlide: 0,
      totalSlides: 12
    };

    // ============================================
    // JSON PARSER
    // ============================================
    function parseWakaTimeJSON(jsonData) {
      if (!jsonData.user || !jsonData.days || !Array.isArray(jsonData.days)) {
        throw new Error('Invalid WakaTime JSON structure');
      }

      const summaries = jsonData.days.map(day => ({
        date: day.date,
        total_seconds: day.grand_total?.total_seconds || 0,
        languages: day.languages || [],
        projects: day.projects || [],
        editors: day.editors || [],
        operating_systems: day.operating_systems || [],
        machines: day.machines || [],
        categories: day.categories || [],
        dependencies: day.dependencies || [],
      }));

      return { summaries, user: jsonData.user };
    }

    // ============================================
    // LANGUAGE ICONS
    // ============================================
    const languageIcons = {
      'Python': '🐍',
      'JavaScript': '📜',
      'TypeScript': '📘',
      'Java': '☕',
      'C++': '⚙️',
      'C': '©️',
      'C#': '♯',
      'Go': '🐹',
      'Rust': '🦀',
      'Ruby': '💎',
      'PHP': '🐘',
      'Swift': '🍎',
      'Kotlin': '🔷',
      'HTML': '🏠',
      'CSS': '🎨',
      'SCSS': '🎨',
      'Sass': '🎨',
      'Markdown': '📝',
      'Bash': '💻',
      'Shell': '💻',
      'PowerShell': '💻',
      'SQL': '🗄️',
      'YAML': '⚙️',
      'JSON': '{ }',
      'XML': '<>',
      'WebGPU Shading Language': '🎮',
      'WGSL': '🎮',
      'GLSL': '🎮',
      'Vue': '💚',
      'React': '⚛️',
      'Angular': '🅰️',
      'Docker': '🐋'
    };

    const editorIcons = {
      'VS Code': '🔷',
      'Visual Studio': '🟣',
      'IntelliJ IDEA': '🔴',
      'PyCharm': '🟢',
      'WebStorm': '🟡',
      'PhpStorm': '🟠',
      'GoLand': '🔵',
      'CLion': '⚫',
      'Android Studio': '🤖',
      'Xcode': '🍎',
      'Vim': '🟩',
      'Neovim': '🟩',
      'Sublime Text': '🟧',
      'Atom': '⚫',
      'Notepad++': '🟢',
      'Eclipse': '🔵',
      'NetBeans': '🔴',
      'Zed': '🟡',
      'Emacs': '🟣',
      'Cursor': '⚡',
    };

    const osIcons = {
      'Windows': '🪟',
      'Mac': '🍎',
      'Linux': '🐧',
      'Chrome OS': '🌐',
    };

    function getLanguageIcon(langName) {
      return languageIcons[langName] || '💻';
    }

    function getEditorIcon(editorName) {
      return editorIcons[editorName] || '💻';
    }

    function getOSIcon(osName) {
      return osIcons[osName] || '🖥️';
    }
    function transformDataForYear(rawData, selectedYear) {
      const { summaries } = rawData;

      // Filter for selected year
      const yearData = summaries.filter(s => {
        const date = new Date(s.date);
        return date.getFullYear() === selectedYear;
      });

      if (yearData.length === 0) throw new Error(`No data for year ${selectedYear}`);

      // Calculate aggregates
      const activeDays = yearData.filter(d => d.categories.length > 0);
      const totalSeconds = yearData.reduce((sum, d) => sum + d.total_seconds, 0);
      const totalHours = totalSeconds / 3600;
      const daysCoded = activeDays.length;
      const dailyAverage = totalHours / 365;

      // Find best day
      const bestDay = yearData.reduce((max, curr) => 
        (curr.total_seconds > max.total_seconds) ? curr : max
      );

      // Aggregate languages
      const languageMap = {};
      yearData.forEach(day => {
        day.languages.forEach(lang => {
          if (!languageMap[lang.name]) {
            languageMap[lang.name] = 0;
          }
          languageMap[lang.name] += lang.total_seconds || 0;
        });
      });

      // Aggregate projects
      const projectMap = {};
      yearData.forEach(day => {
        if (day.projects && day.projects.length > 0) {
          const proj = day.projects[0];
          if (proj && proj.name) {
            if (!projectMap[proj.name]) {
              projectMap[proj.name] = 0;
            }
            projectMap[proj.name] += proj.grand_total?.total_seconds || 0;
          }
        }
      });

      // Aggregate editors
      const editorMap = {};
      yearData.forEach(day => {
        day.editors.forEach(editor => {
          if (!editorMap[editor.name]) {
            editorMap[editor.name] = 0;
          }
          editorMap[editor.name] += editor.total_seconds || 0;
        });
      });

      // Aggregate operating systems
      const osMap = {};
      yearData.forEach(day => {
        day.operating_systems.forEach(os => {
          if (!osMap[os.name]) {
            osMap[os.name] = 0;
          }
          osMap[os.name] += os.total_seconds || 0;
        });
      });

      // Calculate longest streak (only counting days with actual coding)
      const sortedDates = activeDays.map(d => new Date(d.date)).sort((a, b) => a - b);
      let longestStreak = 0;
      let currentStreak = 0;
      let streakStartDate = null;
      let streakEndDate = null;
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          currentStreak = 1;
          streakStartDate = sortedDates[0];
        } else {
          const diff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            currentStreak++;
          } else if (diff > 1) {
            if (currentStreak > longestStreak) {
              longestStreak = currentStreak;
              streakEndDate = sortedDates[i - 1];
            }
            currentStreak = 1;
            streakStartDate = sortedDates[i];
          }
        }
      }
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        streakEndDate = sortedDates[sortedDates.length - 1];
      }

      // Calculate busiest month
      const monthMap = {};
      yearData.forEach(day => {
        const date = new Date(day.date);
        const monthKey = date.getMonth();
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = 0;
        }
        monthMap[monthKey] += day.total_seconds;
      });
      const busiestMonth = Object.entries(monthMap).reduce((max, [month, seconds]) => 
        seconds > max.seconds ? { month: parseInt(month), seconds } : max
      , { month: 0, seconds: 0 });
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];

      // Calculate weekday vs weekend
      let weekdaySeconds = 0;
      let weekendSeconds = 0;
      yearData.forEach(day => {
        const date = new Date(day.date);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendSeconds += day.total_seconds;
        } else {
          weekdaySeconds += day.total_seconds;
        }
      });
      const weekdayHours = weekdaySeconds / 3600;
      const weekendHours = weekendSeconds / 3600;
      const totalCodingSeconds = weekdaySeconds + weekendSeconds;
      const weekendPercent = totalCodingSeconds > 0 ? (weekendSeconds / totalCodingSeconds * 100) : 0;
      const weekdayPercent = totalCodingSeconds > 0 ? (weekdaySeconds / totalCodingSeconds * 100) : 0;

      let weekendLabel = 'The 9-to-5er';
      let weekendSubtitle = 'Weekdays are your thing';
      if (weekendPercent > 40) {
        weekendLabel = 'The Weekend Warrior';
        weekendSubtitle = `${weekendPercent.toFixed(0)}% of your coding happens on weekends`;
      } else if (weekendPercent > 25) {
        weekendLabel = 'The Balanced Coder';
        weekendSubtitle = `You code ${weekdayPercent.toFixed(0)}% weekdays, ${weekendPercent.toFixed(0)}% weekends`;
      }

      // First day coded
      const firstDay = sortedDates[0];

      // Days since first day
      const lastDay = sortedDates[sortedDates.length - 1];
      const daysSince = Math.round((lastDay - firstDay) / (1000 * 60 * 60 * 24));

      // Sort and get top 3 languages
      const topLanguages = Object.entries(languageMap)
        .map(([name, seconds]) => ({
          name,
          seconds,
          hours: seconds / 3600,
          percent: (seconds / totalSeconds) * 100
        }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 3);

      // Get top 20 projects
      const topProjects = Object.entries(projectMap)
        .map(([name, seconds]) => ({
          name,
          seconds,
          hours: seconds / 3600,
          percent: (seconds / totalSeconds) * 100
        }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 20);

      // Get top 3 editors
      const topEditors = Object.entries(editorMap)
        .map(([name, seconds]) => ({
          name,
          seconds,
          hours: seconds / 3600,
          percent: (seconds / totalSeconds) * 100
        }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 3);

      // Get top 3 OS
      const topOS = Object.entries(osMap)
        .map(([name, seconds]) => ({
          name,
          seconds,
          hours: seconds / 3600,
          percent: (seconds / totalSeconds) * 100
        }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 3);

      // Unique language count (polyglot score)
      const uniqueLanguageCount = Object.keys(languageMap).length;

      // Unique project count
      const uniqueProjectCount = Object.keys(projectMap).length;

      // Build heatmap data: date -> hours
      const heatmapDays = {};
      yearData.forEach(day => {
        heatmapDays[day.date] = day.total_seconds / 3600;
      });

      // Get max hours per day for intensity scaling
      const maxHours = Math.max(...yearData.map(d => d.total_seconds / 3600), 1);

      // Year start date (Jan 1) for grid alignment
      const yearStart = new Date(selectedYear, 0, 1);

      return {
        totalHours: Math.round(totalHours),
        daysCoded,
        dailyAverage: dailyAverage.toFixed(1),
        bestDayHours: Math.round(bestDay.total_seconds / 3600),
        bestDayDate: bestDay.date,
        topLanguages,
        topProjects,
        topEditors,
        topOS,
        longestStreak,
        streakStartDate,
        streakEndDate,
        busiestMonth: monthNames[busiestMonth.month],
        busiestMonthHours: Math.round(busiestMonth.seconds / 3600),
        weekendLabel,
        weekendSubtitle,
        weekendPercent,
        weekdayPercent,
        firstDay,
        daysSince,
        uniqueLanguageCount,
        uniqueProjectCount,
        heatmapDays,
        maxHours,
        yearStart
      };
    }

    // ============================================
    // SLIDE MANAGER
    // ============================================
    class SlideManager {
      constructor() {
        this.currentSlide = 0;
        this.slides = [];
        this.indicators = [];
        this.carouselIndex = 0;
        this.carouselProjects = [];
        this.initializeSlides();
      }

      initializeSlides() {
        this.slides = document.querySelectorAll('.slide');
        const indicatorsContainer = document.getElementById('slides-indicators');
        
        indicatorsContainer.innerHTML = '';
        this.slides.forEach((_, index) => {
          const indicator = document.createElement('div');
          indicator.className = 'indicator' + (index === 0 ? ' active' : '');
          indicator.addEventListener('click', () => this.goToSlide(index));
          indicatorsContainer.appendChild(indicator);
          this.indicators.push(indicator);
        });

        this.goToSlide(0);
      }

      goToSlide(index) {
        this.slides.forEach((slide, i) => {
          slide.classList.remove('active', 'prev', 'next');
          this.indicators[i].classList.remove('active');

          if (i === index) {
            slide.classList.add('active');
            this.indicators[i].classList.add('active');
          } else if (i < index) {
            slide.classList.add('prev');
          } else {
            slide.classList.add('next');
          }
        });

        this.currentSlide = index;
      }

      nextSlide() {
        if (this.currentSlide < this.slides.length - 1) {
          this.goToSlide(this.currentSlide + 1);
        }
      }

      prevSlide() {
        if (this.currentSlide > 0) {
          this.goToSlide(this.currentSlide - 1);
        }
      }

      renderProjectCarousel(totalProjects) {
        const track = document.getElementById('carousel-card-track');
        const projects = this.carouselProjects;
        if (projects.length === 0) {
          track.innerHTML = '<div class="project-carousel-card card-active"><div class="project-name">No projects</div></div>';
          return;
        }

        let html = '';
        for (let i = 0; i < projects.length; i++) {
          const cardClass = this.getCardPositionClass(i, this.carouselIndex, projects.length);
          html += `<div class="project-carousel-card ${cardClass}" data-index="${i}">`;
          if (i === 0) {
            html += `<div class="project-percent" style="margin-bottom: 10px; color: #a0a0a0; font-size: 0.9rem;">Across ${totalProjects} project${totalProjects !== 1 ? 's' : ''}</div>`;
          }
          html += `<div class="project-name">${projects[i].name}</div>`;
          html += `<div class="project-hours">${projects[i].hours.toFixed(1)} hours</div>`;
          html += `<div class="project-percent">${projects[i].percent.toFixed(1)}% of your time</div>`;
          html += `</div>`;
        }

        html += `<div class="carousel-nav-zone carousel-nav-zone-left" id="carousel-prev"></div>`;
        html += `<div class="carousel-nav-zone carousel-nav-zone-right" id="carousel-next"></div>`;
        html += `<div class="carousel-dots">${projects.map((_, i) => `<div class="carousel-dot${i === this.carouselIndex ? ' active' : ''}" data-index="${i}"></div>`).join('')}</div>`;

        track.innerHTML = html;

        document.getElementById('carousel-prev').addEventListener('click', () => this.carouselPrev());
        document.getElementById('carousel-next').addEventListener('click', () => this.carouselNext());

        track.querySelectorAll('.carousel-dot').forEach(dot => {
          dot.addEventListener('click', () => {
            this.carouselIndex = parseInt(dot.dataset.index);
            this.updateCarouselClasses();
          });
        });
      }

      getCardPositionClass(index, activeIndex, total) {
        const diff = index - activeIndex;
        if (diff === 0) return 'card-active';
        if (diff === -1) return 'card-left-1';
        if (diff === -2) return 'card-left-2';
        if (diff === 1) return 'card-right-1';
        if (diff === 2) return 'card-right-2';
        return 'card-hidden';
      }

      carouselPrev() {
        if (this.carouselIndex > 0) {
          this.carouselIndex--;
          this.updateCarouselClasses();
        }
      }

      carouselNext() {
        if (this.carouselIndex < this.carouselProjects.length - 1) {
          this.carouselIndex++;
          this.updateCarouselClasses();
        }
      }

      updateCarouselClasses() {
        const cards = document.querySelectorAll('.project-carousel-card');
        cards.forEach((card, i) => {
          const classList = Array.from(card.classList);
          classList.forEach(c => {
            if (c.startsWith('card-')) card.classList.remove(c);
          });
          card.classList.add(this.getCardPositionClass(i, this.carouselIndex, this.carouselProjects.length));
        });

        document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === this.carouselIndex);
        });
      }

      renderHeatmap(data) {
        const container = document.getElementById('heatmap-container');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const year = data.yearStart.getFullYear();
        const startDate = new Date(year, 0, 1);
        const startDayOfWeek = startDate.getDay();

        // Build weeks array aligned to Sun-Sat
        const weeks = [];
        let currentWeek = [];
        for (let i = 0; i < startDayOfWeek; i++) currentWeek.push(null);

        let currentDate = new Date(startDate);
        const endDate = new Date(year, 11, 31);
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          currentWeek.push({
            date: dateKey,
            hours: data.heatmapDays[dateKey] || 0,
            month: currentDate.getMonth(),
            day: currentDate.getDate()
          });
          if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        if (currentWeek.length > 0) {
          while (currentWeek.length < 7) currentWeek.push(null);
          weeks.push(currentWeek);
        }

        const maxHours = data.maxHours;

        function getLevel(hours) {
          if (hours === 0) return 0;
          const ratio = hours / maxHours;
          if (ratio <= 0.2) return 1;
          if (ratio <= 0.4) return 2;
          if (ratio <= 0.6) return 3;
          if (ratio <= 0.8) return 4;
          return 5;
        }

        // Build month label row
        const monthPositions = [];
        let lastMonth = -1;
        let weekOffset = 0;
        weeks.forEach((week, wi) => {
          for (let di = 0; di < 7; di++) {
            const day = week[di];
            if (day && day.month !== lastMonth) {
              monthPositions.push({ label: monthNames[day.month], weekIndex: weekOffset });
              lastMonth = day.month;
              break;
            }
          }
          weekOffset++;
        });

        let html = '<div class="heatmap-months-row">';
        const cellSize = 14; // 12px + 2px gap
        const gridWidth = weeks.length * cellSize;
        monthPositions.forEach(mp => {
          const rawLeft = mp.weekIndex * cellSize;
          const labelWidth = mp.label.length * 7;
          const leftPos = Math.min(rawLeft, gridWidth - labelWidth);
          html += `<span class="heatmap-month-label" style="position: absolute; left: ${leftPos}px; font-size: 0.65rem; color: #a0a0a0;">${mp.label}</span>`;
        });
        html += '</div>';

        // Build heatmap grid
        html += '<div class="heatmap-grid">';
        weeks.forEach(week => {
          html += '<div class="heatmap-week">';
          week.forEach(day => {
            if (day) {
              const level = getLevel(day.hours);
              const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              html += `<div class="heatmap-day" data-level="${level}" title="${dayName}: ${day.hours.toFixed(1)}h"></div>`;
            } else {
              html += `<div class="heatmap-day"></div>`;
            }
          });
          html += '</div>';
        });
        html += '</div>';

        // Legend
        html += `<div class="heatmap-labels"><span class="heatmap-label">Less</span><span class="heatmap-label">More</span></div>`;

        container.innerHTML = html;
      }

      populate(data) {
        // Slide 1 (index 1): First Day Coded
        const firstDayDate = data.firstDay.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('stat-first-day').textContent = firstDayDate;
        document.getElementById('stat-days-since').textContent = `${data.daysSince} days of this journey`;

        // Slide 2 (index 2): Total Hours + Daily Average
        document.getElementById('stat-hours').textContent = data.totalHours.toLocaleString();
        document.getElementById('stat-hours-unit').textContent = `hours of focused time · ${data.dailyAverage}h/day average`;
        document.getElementById('stat-days-coded').textContent = `Across ${data.daysCoded} days`;

        // Render heatmap
        this.renderHeatmap(data);

        // Slide 3 (index 3): Top Languages with icons
        const languageList = document.getElementById('language-list');
        languageList.innerHTML = data.topLanguages.map((lang, i) => `
          <div class="language-item">
            <div class="language-header">
              <span class="language-icon">${getLanguageIcon(lang.name)}</span>
              <div class="language-name">#${i + 1} ${lang.name}</div>
            </div>
            <div class="language-bar">
              <div class="language-bar-fill" style="--width: ${lang.percent}%"></div>
            </div>
            <div class="language-percent">${lang.hours.toFixed(1)} hours (${lang.percent.toFixed(1)}%)</div>
          </div>
        `).join('');

        // Slide 4 (index 4): Project Carousel
        this.carouselProjects = data.topProjects || [];
        this.carouselIndex = 0;
        this.renderProjectCarousel(data.uniqueProjectCount);

        // Slide 5 (index 5): Best Day
        document.getElementById('stat-best-day').textContent = data.bestDayHours;
        document.getElementById('stat-best-day-date').textContent = `On ${new Date(data.bestDayDate).toLocaleDateString()}`;

        // Slide 6 (index 6): IDE of Choice
        const editorList = document.getElementById('editor-list');
        if (data.topEditors && data.topEditors.length > 0) {
          editorList.innerHTML = data.topEditors.map((editor, i) => `
            <div class="editor-item">
              <div class="editor-header">
                <span class="editor-icon">${getEditorIcon(editor.name)}</span>
                <div class="editor-name">#${i + 1} ${editor.name}</div>
              </div>
              <div class="editor-bar">
                <div class="editor-bar-fill" style="--width: ${editor.percent}%"></div>
              </div>
              <div class="editor-percent">${editor.hours.toFixed(1)} hours (${editor.percent.toFixed(1)}%)</div>
            </div>
          `).join('');
        }

        // Slide 7 (index 7): Dev OS
        const osList = document.getElementById('os-list');
        if (data.topOS && data.topOS.length > 0) {
          osList.innerHTML = data.topOS.map((os, i) => `
            <div class="os-item">
              <div class="os-header">
                <span class="os-icon">${getOSIcon(os.name)}</span>
                <div class="os-name">${os.name}</div>
              </div>
              <div class="os-bar">
                <div class="os-bar-fill" style="--width: ${os.percent}%"></div>
              </div>
              <div class="os-percent">${os.hours.toFixed(1)} hours (${os.percent.toFixed(1)}%)</div>
            </div>
          `).join('');
        }

        // Slide 8 (index 8): Coding Streak
        document.getElementById('stat-streak').textContent = data.longestStreak;
        if (data.longestStreak > 30) {
          document.getElementById('stat-streak-subtitle').textContent = 'Absolutely unstoppable! 🔥';
        } else if (data.longestStreak > 14) {
          document.getElementById('stat-streak-subtitle').textContent = 'On fire! 🔥';
        } else if (data.longestStreak > 7) {
          document.getElementById('stat-streak-subtitle').textContent = 'Keep it going!';
        } else {
          document.getElementById('stat-streak-subtitle').textContent = 'Every day counts!';
        }

        // Slide 9 (index 9): Busiest Month + Weekday vs Weekend
        document.getElementById('busiest-card').innerHTML = `
          <div class="busiest-month-name">${data.busiestMonth}</div>
          <div class="busiest-hours">${data.busiestMonthHours} hours coded</div>
          <div class="busiest-subtitle">Your most productive month</div>
        `;
        document.getElementById('weekday-card').innerHTML = `
          <div class="weekday-badge">${data.weekendLabel}</div>
          <div class="weekday-label">${data.weekdayPercent.toFixed(0)}% weekdays · ${data.weekendPercent.toFixed(0)}% weekends</div>
          <div class="weekday-subtitle">${data.weekendSubtitle}</div>
        `;

        // Slide 10 (index 10): Polyglot Score
        document.getElementById('stat-polyglot').textContent = data.uniqueLanguageCount;
        document.getElementById('stat-polyglot-label').textContent = data.uniqueLanguageCount === 1 ? 'language used' : 'languages used';
        if (data.uniqueLanguageCount > 10) {
          document.getElementById('stat-polyglot-subtitle').textContent = 'Polyglot master! 🌍';
        } else if (data.uniqueLanguageCount > 5) {
          document.getElementById('stat-polyglot-subtitle').textContent = 'Jack of all trades!';
        } else if (data.uniqueLanguageCount > 3) {
          document.getElementById('stat-polyglot-subtitle').textContent = 'Nice variety!';
        } else {
          document.getElementById('stat-polyglot-subtitle').textContent = 'Focused and dedicated!';
        }

        // Slide 11 (index 11): Final Card (merged with outro)
        this.generateFinalCard(data, appState.userData.user);
      }

      generateFinalCard(data, user) {
        const finalCard = document.getElementById('final-card');
        const topLangsHtml = data.topLanguages.map((lang, i) => 
          `<div style="display: flex; justify-content: space-between; margin: 8px 0;"><span>${getLanguageIcon(lang.name)} ${lang.name}</span><span style="color: #00d4ff;">${lang.hours.toFixed(1)}h</span></div>`
        ).join('');

        const topProjectsHtml = data.topProjects.slice(0, 3).map((proj, i) => 
          `<div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid rgba(0, 212, 255, 0.1);"><span style="font-weight: 600;">#${i + 1} ${proj.name}</span><span style="color: #00d4ff;">${proj.hours.toFixed(1)}h</span></div>`
        ).join('');

        const username = user?.github_username || user?.username || 'Developer';

        finalCard.innerHTML = `
          <div class="final-card-content">
            <div>
              <h2 style="font-size: 2.5rem; margin-bottom: 10px; color: #00d4ff;">Your ${appState.selectedYear} Wrapped</h2>
            </div>
            <div style="color: #a0a0a0; margin-bottom: 30px;">Your coding journey at a glance</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; text-align: left;">
              <div>
                <div style="color: #a0a0a0; font-size: 0.9rem; margin-bottom: 5px;">Total Hours</div>
                <div style="font-size: 2rem; font-weight: 700; color: #00d4ff;">${data.totalHours}</div>
              </div>
              <div>
                <div style="color: #a0a0a0; font-size: 0.9rem; margin-bottom: 5px;">Days Coded</div>
                <div style="font-size: 2rem; font-weight: 700; color: #00d4ff;">${data.daysCoded}</div>
              </div>
              <div>
                <div style="color: #a0a0a0; font-size: 0.9rem; margin-bottom: 5px;">Daily Avg</div>
                <div style="font-size: 2rem; font-weight: 700; color: #00d4ff;">${data.dailyAverage}h</div>
              </div>
              <div>
                <div style="color: #a0a0a0; font-size: 0.9rem; margin-bottom: 5px;">Best Day</div>
                <div style="font-size: 2rem; font-weight: 700; color: #00d4ff;">${data.bestDayHours}h</div>
              </div>
            </div>

            <div style="text-align: left; border-top: 1px solid rgba(0, 212, 255, 0.2); padding-top: 20px;">
              <div style="color: #a0a0a0; font-size: 0.9rem; margin-bottom: 12px;">Top Languages</div>
              ${topLangsHtml}
            </div>

            <div style="text-align: left; border-top: 1px solid rgba(0, 212, 255, 0.2); padding-top: 20px; margin-top: 20px;">
              <div style="color: #a0a0a0; font-size: 0.9rem; margin-bottom: 12px;">Main Focus</div>
              ${topProjectsHtml}
            </div>

            <div style="border-top: 1px solid rgba(0, 212, 255, 0.2); padding-top: 20px; margin-top: 20px; text-align: right;">
              <div style="color: #00d4ff; font-size: 0.95rem; font-weight: 600;">@${username}</div>
            </div>
          </div>
        `;

        document.getElementById('download-wrapped-btn').addEventListener('click', () => this.downloadFinalCard());
      }

      downloadFinalCard() {
        const card = document.getElementById('final-card');
        const btn = document.getElementById('download-wrapped-btn');
        btn.textContent = 'Generating...';
        btn.disabled = true;

        const clone = card.cloneNode(true);
        clone.style.animation = 'none';
        clone.style.opacity = '1';
        clone.style.transform = 'none';

        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '0';
        wrapper.style.padding = '50px';
        wrapper.style.width = '600px';
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        html2canvas(wrapper, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true
        }).then(canvas => {
          const link = document.createElement('a');
          link.download = `wakatime-wrapped-${appState.selectedYear}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();

          document.body.removeChild(wrapper);
          btn.textContent = 'Download PNG';
          btn.disabled = false;
        }).catch(() => {
          document.body.removeChild(wrapper);
          btn.textContent = 'Download PNG';
          btn.disabled = false;
        });
      }
    }

    let slideManager;

    // ============================================
    // EVENT LISTENERS & INITIALIZATION
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
      slideManager = new SlideManager();

      // File upload
      const fileInput = document.getElementById('json-upload');
      const fileBrowseBtn = document.getElementById('file-browse-btn');
      const fileName = document.getElementById('file-name');

      fileBrowseBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        fileName.textContent = `📁 ${file.name}`;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const jsonData = JSON.parse(event.target.result);
            appState.userData = parseWakaTimeJSON(jsonData);

            // Extract years
            const years = [...new Set(
              appState.userData.summaries.map(s => new Date(s.date).getFullYear())
            )].sort().reverse();

            // Show year selector
            const yearSelector = document.getElementById('year-selector');
            yearSelector.innerHTML = years.map(year => `
              <button type="button" class="year-btn" data-year="${year}">
                ${year}
              </button>
            `).join('');

            document.getElementById('year-selector-group').style.display = 'block';

            // Year selection
            document.querySelectorAll('.year-btn').forEach(btn => {
              btn.addEventListener('click', () => {
                document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                appState.selectedYear = parseInt(btn.dataset.year);
                document.getElementById('generate-btn').disabled = false;
              });
            });

            document.getElementById('error-message').classList.remove('show');
          } catch (err) {
            const errorEl = document.getElementById('error-message');
            errorEl.textContent = '❌ Invalid file: ' + err.message;
            errorEl.classList.add('show');
          }
        };
        reader.readAsText(file);
      });

      // Generate wrapped
      document.getElementById('token-form').addEventListener('submit', (e) => {
        e.preventDefault();

        if (!appState.userData || !appState.selectedYear) return;

        // Show loading
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');

        setTimeout(() => {
          try {
            appState.transformedData = transformDataForYear(appState.userData, appState.selectedYear);

            // Update year in slides
            document.querySelectorAll('.slide-title, .stat-label').forEach(el => {
              const text = el.textContent;
              el.textContent = text.replace('2024', appState.selectedYear);
            });

            slideManager.populate(appState.transformedData);

            // Hide loading and show wrapped
            loadingOverlay.classList.add('hidden');
            document.getElementById('token-screen').style.display = 'none';
            document.getElementById('wrapped-screen').classList.remove('hidden');
            slideManager.goToSlide(0);
          } catch (err) {
            const errorEl = document.getElementById('error-message');
            errorEl.textContent = '❌ Error: ' + err.message;
            errorEl.classList.add('show');
            loadingOverlay.classList.add('hidden');
          }
        }, 500);
      });

      // Slide navigation
      document.getElementById('next-slide').addEventListener('click', () => slideManager.nextSlide());
      document.getElementById('prev-slide').addEventListener('click', () => slideManager.prevSlide());

      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (!document.getElementById('wrapped-screen').classList.contains('hidden')) {
          if (e.key === 'ArrowRight') slideManager.nextSlide();
          if (e.key === 'ArrowLeft') slideManager.prevSlide();
        }
      });

    });
