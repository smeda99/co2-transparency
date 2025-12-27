document.addEventListener('DOMContentLoaded', () => {
  
  // ========================================
  // BURGER-MENÜ
  // ========================================
  
  const burgerMenu = {
    burgerBtn: document.getElementById('burgerMenuBtn'),
    mobileNav: document.getElementById('mobileNav'),
    mobileNavClose: document.getElementById('mobileNavClose'),
    
    init() {
      if (!this.burgerBtn || !this.mobileNav || !this.mobileNavClose) return;
      
      // Burger-Menü öffnen
      this.burgerBtn.addEventListener('click', () => this.toggle());
      
      // Burger-Menü schließen
      this.mobileNavClose.addEventListener('click', () => this.close());
      
      // Burger-Menü schließen bei Klick auf einen Link
      const mobileLinks = this.mobileNav.querySelectorAll('.mobile-nav-link');
      mobileLinks.forEach(link => {
        link.addEventListener('click', () => this.close());
      });
      
      // Burger-Menü schließen bei Klick außerhalb
      document.addEventListener('click', (e) => {
        if (this.mobileNav.classList.contains('active') && 
            !this.mobileNav.contains(e.target) && 
            !this.burgerBtn.contains(e.target)) {
          this.close();
        }
      });
    },
    
    toggle() {
      this.burgerBtn.classList.toggle('active');
      this.mobileNav.classList.toggle('active');
      document.body.style.overflow = this.mobileNav.classList.contains('active') ? 'hidden' : '';
    },
    
    close() {
      this.burgerBtn.classList.remove('active');
      this.mobileNav.classList.remove('active');
      document.body.style.overflow = '';
    }
  };
  
  burgerMenu.init();
  
  // ========================================
  // HAUPTANWENDUNG
  // ========================================
  
  const co2App = {
    table: document.getElementById('CO2'),
    filterInput: document.getElementById('filterInput'),
    mobileFilterInput: document.getElementById('mobileFilterInput'),
    originalRows: [],
    
    // Sicherheits-Konfiguration
    config: {
      maxSearchLength: 100,
      debounceDelay: 300
    },

    init() {
      if (!this.table) return;

      this.initSort();
      this.initFilter();
      this.initTooltips();
      this.fixIconCentering();
      this.syncSearchFields();
    },

    // ========================================
    // SUCHFELD-SYNCHRONISATION (Desktop & Mobile)
    // ========================================

    syncSearchFields() {
      if (!this.filterInput || !this.mobileFilterInput) return;
      
      // Desktop-Suchfeld aktualisiert Mobile-Suchfeld
      this.filterInput.addEventListener('input', () => {
        this.mobileFilterInput.value = this.filterInput.value;
      });
      
      // Mobile-Suchfeld aktualisiert Desktop-Suchfeld
      this.mobileFilterInput.addEventListener('input', () => {
        this.filterInput.value = this.mobileFilterInput.value;
        this.filterTable();
      });
    },

    // ========================================
    // SORTIER-FUNKTIONALITÄT
    // ========================================

    initSort() {
      const headers = this.table.querySelectorAll('thead th[data-sortable]');
      
      // Original-Reihenfolge für Reset speichern
      const rows = this.table.tBodies[0]?.rows || [];
      this.originalRows = Array.from(rows);
      this.originalRows.forEach((r, i) => r.dataset.origIndex = i);

      // Event Listener für jede sortierbare Spalte
      headers.forEach((th, index) => {
        // Basis-Label sichern
        th.dataset.label = th.textContent.trim();
        
        // Cursor setzen
        th.style.cursor = 'pointer';
        
        // Click-Handler
        th.addEventListener('click', () => this.sortTable(index));
        
        // Pfeile initial setzen
        th.textContent = th.dataset.label + ' ↕';
      });
    },

    sortTable(columnIndex) {
      if (!this.table || !this.table.tBodies[0]) return;

      const tbody = this.table.tBodies[0];
      const rows = Array.from(tbody.rows);
      const th = this.table.querySelectorAll('thead th[data-sortable]')[columnIndex];

      // Bisheriger Zustand
      const prevCol = this.table.getAttribute('data-sort-col');
      const prevDir = this.table.getAttribute('data-sort-dir');

      // Nächste Richtung bestimmen
      let nextDir;
      if (prevCol != String(columnIndex)) {
        nextDir = 'asc';
      } else if (prevDir === 'asc') {
        nextDir = 'desc';
      } else if (prevDir === 'desc') {
        nextDir = null; // Reset
      } else {
        nextDir = 'asc';
      }

      // Reset aller Header-Pfeile
      this.table.querySelectorAll('thead th[data-sortable]').forEach(header => {
        const base = header.dataset.label || header.textContent.replace(/[▲▼↕]\s*$/, '').trim();
        header.textContent = base + ' ↕';
      });

      // Sortieren oder Reset
      let sortedRows;
      if (nextDir === null) {
        // Reset auf Original-Reihenfolge
        sortedRows = this.originalRows;
        th.textContent = th.dataset.label + ' ↕';
      } else {
        // Sortieren
        sortedRows = rows.sort((a, b) => {
          // textContent statt innerText verwenden
          const x = a.cells[columnIndex]?.textContent.trim() ?? '';
          const y = b.cells[columnIndex]?.textContent.trim() ?? '';

          // Numerisch sortieren 
          const nx = parseFloat(x.replace(/\./g, '').replace(',', '.'));
          const ny = parseFloat(y.replace(/\./g, '').replace(',', '.'));
          
          if (!isNaN(nx) && !isNaN(ny)) {
            return nextDir === 'asc' ? nx - ny : ny - nx;
          }

          // Text sortieren 
          const cmp = x.localeCompare(y, 'de', { sensitivity: 'base' });
          return nextDir === 'asc' ? cmp : -cmp;
        });

        // Pfeil setzen
        th.textContent = th.dataset.label + (nextDir === 'asc' ? ' ▲' : ' ▼');
      }

      // Neu einfügen
      sortedRows.forEach(r => tbody.appendChild(r));

      // Zustand speichern
      if (nextDir === null) {
        this.table.removeAttribute('data-sort-col');
        this.table.removeAttribute('data-sort-dir');
      } else {
        this.table.setAttribute('data-sort-col', columnIndex);
        this.table.setAttribute('data-sort-dir', nextDir);
      }
    },

    // ========================================
    // FILTER-FUNKTIONALITÄT 
    // ========================================

    initFilter() {
      if (!this.filterInput) return;
      
      // Debouncing für bessere Performance
      let debounceTimer;
      this.filterInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.filterTable();
        }, this.config.debounceDelay);
      });
      
      // Echtzeit-Validierung: Blockiere gefährliche Zeichen
      this.filterInput.addEventListener('keypress', (e) => {
        const char = String.fromCharCode(e.which || e.keyCode);
        if (char === '<' || char === '>') {
          e.preventDefault();
          this.showWarning('Die Zeichen < und > sind nicht erlaubt');
        }
      });
      
      // Paste-Event: Entferne gefährliche Zeichen
      this.filterInput.addEventListener('paste', (e) => {
        setTimeout(() => {
          const value = this.filterInput.value;
          if (value.includes('<') || value.includes('>')) {
            this.filterInput.value = value.replace(/[<>]/g, '');
            this.showWarning('HTML-Tags wurden entfernt');
          }
        }, 0);
      });

      // Fokus ins Feld, wenn Dropdown aufgeht
      const dropdownBtn = document.getElementById('searchDropdownBtn');
      if (dropdownBtn) {
        dropdownBtn.addEventListener('shown.bs.dropdown', () => {
          this.filterInput.focus();
        });
      }
      
      // Gleiche Validierung für Mobile-Suchfeld
      if (this.mobileFilterInput) {
        this.mobileFilterInput.addEventListener('keypress', (e) => {
          const char = String.fromCharCode(e.which || e.keyCode);
          if (char === '<' || char === '>') {
            e.preventDefault();
            this.showWarning('Die Zeichen < und > sind nicht erlaubt');
          }
        });
        
        this.mobileFilterInput.addEventListener('paste', (e) => {
          setTimeout(() => {
            const value = this.mobileFilterInput.value;
            if (value.includes('<') || value.includes('>')) {
              this.mobileFilterInput.value = value.replace(/[<>]/g, '');
              this.showWarning('HTML-Tags wurden entfernt');
            }
          }, 0);
        });
      }
    },

    filterTable() {
      if (!this.table) return;

      // Nimm den Wert vom aktiven Suchfeld (Desktop oder Mobile)
      const rawInput = this.filterInput?.value || this.mobileFilterInput?.value || '';
      
      // Leere Eingabe → alle Zeilen anzeigen
      if (!rawInput || rawInput.trim() === '') {
        this.showAllRows();
        return;
      }
      
      // 2. Validierung
      if (rawInput.length > this.config.maxSearchLength) {
        this.showWarning(`Suchbegriff ist zu lang (max. ${this.config.maxSearchLength} Zeichen)`);
        if (this.filterInput) this.filterInput.value = rawInput.substring(0, this.config.maxSearchLength);
        if (this.mobileFilterInput) this.mobileFilterInput.value = rawInput.substring(0, this.config.maxSearchLength);
        return;
      }
      
      // 3. Sanitization
      const sanitizedInput = this.sanitizeInput(rawInput);
      
      // 4. Vergleich
      const filter = sanitizedInput.toUpperCase();
      const tbody = this.table.tBodies[0] || this.table;
      const rows = tbody.getElementsByTagName('tr');

      for (let i = 0; i < rows.length; i++) {
        const tds = rows[i].getElementsByTagName('td');
        if (!tds.length) continue; 

        let show = false;
        for (let j = 0; j < tds.length; j++) {
          const txt = (tds[j].textContent || '').toUpperCase();
          if (txt.includes(filter)) {
            show = true;
            break;
          }
        }
        rows[i].style.display = show ? '' : 'none';
      }
    },

    showAllRows() {
      if (!this.table) return;
      const tbody = this.table.tBodies[0] || this.table;
      const rows = tbody.getElementsByTagName('tr');
      for (let i = 0; i < rows.length; i++) {
        rows[i].style.display = '';
      }
    },

    // Sanitiert Benutzereingaben gegen XSS
    sanitizeInput(input) {
      if (!input || typeof input !== 'string') {
        return '';
      }
      
      let sanitized = input.trim();
      
      // HTML-Zeichen 
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
      
      // Null-Bytes entfernen
      sanitized = sanitized.replace(/\0/g, '');
      
      return sanitized;
    },


    showWarning(message) {
      // Alte Warnung entfernen
      const oldWarning = document.querySelector('.search-warning');
      if (oldWarning) oldWarning.remove();
      
      const warning = document.createElement('div');
      warning.className = 'search-warning alert alert-warning alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
      warning.setAttribute('role', 'alert');
      warning.style.zIndex = '9999';
      warning.style.minWidth = '300px';
      
      // Icon
      const icon = document.createElement('i');
      icon.className = 'bi bi-exclamation-triangle-fill me-2';
      warning.appendChild(icon);
      
      // Text SICHER hinzufügen (textContent!)
      const text = document.createTextNode(message);
      warning.appendChild(text);
      
      // Close-Button
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'btn-close';
      closeBtn.setAttribute('data-bs-dismiss', 'alert');
      closeBtn.setAttribute('aria-label', 'Close');
      warning.appendChild(closeBtn);
      
      document.body.appendChild(warning);
      
      setTimeout(() => {
        warning.classList.remove('show');
        setTimeout(() => warning.remove(), 150);
      }, 3000);
    },

    // ========================================
    // TOOLTIPS
    // ========================================

    initTooltips() {
      const triggers = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      triggers.forEach(el => new bootstrap.Tooltip(el, { container: 'body' }));
    },

    // ========================================
    // ICON-ZENTRIERUNG FIX
    // ========================================

    fixIconCentering() {
      // Icons in Buttons perfekt zentrieren
      document.querySelectorAll('.button-header i, .icon-btn .bi').forEach(icon => {
        icon.style.display = 'block';
        icon.style.lineHeight = '1';
        // Optional: Stelle sicher, dass das Icon die richtige Größe hat
        // icon.style.fontSize = 'var(--icon-size)';
      });
    }
  };

  // App initialisieren
  co2App.init();
});
