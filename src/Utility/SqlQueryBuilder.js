// sql-query-builder.js
// Version with fixed refresh behavior (no unwanted reset when adding new SELECT row)

export function showSqlQueryBuilder(options = {}) {

    const {
      schema = {},
      onQueryGenerated = (sql) => console.log("Generated SQL:", sql),
      onClose = () => {},
      title = "SQL Query Builder",
      initialBaseTable = null,
      initialBaseAlias = null
    } = options;

    if (Object.keys(schema).length === 0) {
      alert("No schema provided!");
      return;
    }

    const tables = Object.keys(schema);
    const defaultTable = initialBaseTable || tables[0] || "";
    const defaultAlias = initialBaseAlias || (defaultTable ? defaultTable.charAt(0).toLowerCase() : "");

    document.getElementById("sql-builder-modal")?.remove();

    const modal = document.createElement("div");
    modal.id = "sql-builder-modal";
    modal.innerHTML = `
      <div class="sql-modal-overlay"></div>
      <div class="sql-modal-content">
        <div class="sql-modal-header">
          <h2>${title}</h2>
          <button class="sql-close-btn" title="Close">×</button>
        </div>
        <div class="sql-modal-body">
          <div class="section">
            <h3>Base Table</h3>
            <select id="baseTable"></select>
            <label>Alias: <input id="baseAlias" placeholder="alias (required)" size="10" value="${defaultAlias}"></label>
          </div>

          <div class="section">
            <h3>SELECT Columns</h3>
            <div id="selectCols"></div>
            <button class="add-btn" type="button">+ Column</button>
          </div>

          <div class="section">
            <h3>Joins</h3>
            <div id="joins"></div>
            <button class="add-btn" type="button">+ Join</button>
          </div>

          <div class="section">
            <h3>WHERE Conditions <small>(AND)</small></h3>
            <div id="conditions"></div>
            <button class="add-btn" type="button">+ Condition</button>
          </div>

          <div class="section">
            <h3>GROUP BY</h3>
            <div id="groupByCols"></div>
            <button class="add-btn" type="button">+ Group By</button>
          </div>

          <div class="section">
            <h3>ORDER BY</h3>
            <div id="orderBy"></div>
            <button class="add-btn" type="button">+ Order By</button>
          </div>

          <div class="section">
            <h3>LIMIT / OFFSET</h3>
            <div class="row">
              LIMIT: <input id="limitInput" type="number" min="0" placeholder="e.g. 100" size="8">
              OFFSET: <input id="offsetInput" type="number" min="0" placeholder="e.g. 0" size="8">
            </div>
          </div>

          <div style="margin:24px 0; text-align:right;">
            <button id="btnGenerateClose" class="generate-btn">Generate & Close</button>
            <button id="btnClose" class="close-btn">Close</button>
          </div>

          <h3>SQL Preview</h3>
          <pre id="output">-- SQL preview --</pre>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const baseTableSel   = modal.querySelector("#baseTable");
    const baseAliasInp   = modal.querySelector("#baseAlias");
    const selectColsDiv  = modal.querySelector("#selectCols");
    const joinsDiv       = modal.querySelector("#joins");
    const groupByDiv     = modal.querySelector("#groupByCols");
    const orderByDiv     = modal.querySelector("#orderBy");
    const condDiv        = modal.querySelector("#conditions");
    const limitInput     = modal.querySelector("#limitInput");
    const offsetInput    = modal.querySelector("#offsetInput");
    const outputPre      = modal.querySelector("#output");

    tables.forEach(t => {
      baseTableSel.innerHTML += `<option value="${t}">${t}</option>`;
    });
    baseTableSel.value = defaultTable;

    baseTableSel.addEventListener("change", () => {
      if (!baseAliasInp.value.trim() && baseTableSel.value) {
        baseAliasInp.value = baseTableSel.value.charAt(0).toLowerCase();
      }
      resetAll();
    });

    baseAliasInp.addEventListener("input", refreshAll);

    modal.querySelector(".sql-close-btn").onclick = closeModal;
    modal.querySelector("#btnClose").onclick = closeModal;
    modal.querySelector("#btnGenerateClose").onclick = () => {
      const sql = generateSQL();
      if (sql) onQueryGenerated(sql);
      closeModal();
    };

    modal.querySelectorAll(".add-btn").forEach(btn => {
      const txt = btn.textContent.toLowerCase();
      btn.onclick = () => {
             if (txt.includes("column"))     addSelect();
        else if (txt.includes("join"))      addJoin();
        else if (txt.includes("condition")) addCondition();
        else if (txt.includes("group"))     addGroupBy();
        else if (txt.includes("order"))     addOrderBy();
      };
    });

    // ────────────────────────────────────────────────
    // Core functions
    // ────────────────────────────────────────────────

    function getAliasMap() {
      const map = {};
      const ba = baseAliasInp.value.trim();
      if (ba && baseTableSel.value) map[ba] = baseTableSel.value;

      joinsDiv.querySelectorAll(".join-row").forEach(r => {
        const a = r.querySelector(".join-alias")?.value.trim();
        const t = r.querySelector(".join-table")?.value;
        if (a && t) map[a] = t;
      });
      return map;
    }

    function getAllColumns() {
      const map = getAliasMap();
      let cols = [];
      Object.entries(map).forEach(([alias, table]) => {
        if (schema[table]) {
          schema[table].forEach(c => cols.push(`${alias}.${c}`));
        }
      });
      return cols.sort();
    }

    function isColumnInSelect(col) {
      return Array.from(selectColsDiv.querySelectorAll(".select-col"))
        .some(s => s.value === col);
    }

    function addToSelectIfMissing(col) {
      if (col && !isColumnInSelect(col)) {
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `
          <select class="select-col"><option value="${col}">${col}</option></select>
          <input class="select-alias" placeholder="AS ..." size="12">
          <button class="delete-btn">×</button>
        `;
        row.querySelector(".delete-btn").onclick = () => { row.remove(); refreshAll(); };
        selectColsDiv.appendChild(row);
      }
    }

    function refreshAll() {
      const cols = getAllColumns();
      const hasAlias = Object.keys(getAliasMap()).length > 0;

      const msg = hasAlias
        ? (cols.length ? "" : "— no columns — check schema")
        : "→ enter base alias first";

      const refreshDropdowns = (container, selector) => {
        container.querySelectorAll(selector).forEach(sel => {
          const currentVal = sel.value; // preserve before changing options

          let optionsHTML = cols.length
            ? cols.map(c => `<option value="${c}">${c}</option>`).join("")
            : `<option disabled selected>${msg}</option>`;

          sel.innerHTML = optionsHTML;

          // Restore only if still valid
          if (currentVal && cols.includes(currentVal)) {
            sel.value = currentVal;
          }
          // Do NOT auto-select first item for new/empty selects
        });
      };

      refreshDropdowns(selectColsDiv, ".select-col");
      refreshDropdowns(condDiv,       ".where-col");
      refreshDropdowns(groupByDiv,    ".group-col");
      refreshDropdowns(orderByDiv,    ".order-col");

      // JOIN left/right – careful preserve
      joinsDiv.querySelectorAll(".join-row").forEach(row => {
        const own = row.querySelector(".join-alias")?.value.trim() || "";
        const leftSel  = row.querySelector(".left-col");
        const rightSel = row.querySelector(".right-col");

        const leftCols = cols.filter(c => !own || !c.startsWith(own + "."));
        const prevLeft = leftSel.value;
        leftSel.innerHTML = leftCols.length
          ? leftCols.map(c => `<option value="${c}">${c}</option>`).join("")
          : `<option disabled>${msg}</option>`;
        if (leftCols.includes(prevLeft)) leftSel.value = prevLeft;

        const tbl = getAliasMap()[own];
        const rightCols = tbl && schema[tbl] ? schema[tbl].map(c => `${own}.${c}`) : [];
        const prevRight = rightSel.value;
        rightSel.innerHTML = rightCols.length
          ? rightCols.map(c => `<option value="${c}">${c}</option>`).join("")
          : `<option disabled>— enter alias first —</option>`;
        if (rightCols.includes(prevRight)) rightSel.value = prevRight;
      });

      outputPre.textContent = generateSQL() || "-- incomplete query --";
    }

    function addSelect() {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <select class="select-col"></select>
        <input class="select-alias" placeholder="AS ..." size="12">
        <button class="delete-btn">×</button>
      `;
      row.querySelector(".delete-btn").onclick = () => { row.remove(); refreshAll(); };
      selectColsDiv.appendChild(row);
      refreshAll();
    }

    function addJoin() {
      const row = document.createElement("div");
      row.className = "row join-row";
      row.innerHTML = `
        <select class="join-type">
          <option selected>JOIN</option>
          <option>INNER JOIN</option>
          <option>LEFT JOIN</option>
          <option>RIGHT JOIN</option>
          <option>FULL JOIN</option>
        </select>
        <select class="join-table">${tables.map(t => `<option>${t}</option>`).join("")}</select>
        <input class="join-alias" placeholder="alias (required)" size="12">
        <span>ON</span>
        <select class="left-col"></select>
        <select class="join-op"><option>=</option><option>!=</option><option>></option><option><</option><option>>=</option><option><=</option><option>LIKE</option></select>
        <select class="right-col"></select>
        <button class="delete-btn">×</button>
      `;
      row.querySelector(".delete-btn").onclick = () => { row.remove(); refreshAll(); };
      row.querySelector(".join-alias").addEventListener("input", refreshAll);
      row.querySelector(".join-table").addEventListener("change", refreshAll);

      // Auto-focus alias input when adding join
      setTimeout(() => {
        row.querySelector(".join-alias").focus();
      }, 100);

      joinsDiv.appendChild(row);
      refreshAll();
    }

    function addCondition() {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <select class="where-col"></select>
        <select class="where-op">
          <option>=</option><option>!=</option><option>></option><option><</option>
          <option>>=</option><option><=</option><option>LIKE</option>
          <option>IS NULL</option><option>IS NOT NULL</option>
        </select>
        <input class="where-value" placeholder="value">
        <button class="delete-btn">×</button>
      `;
      row.querySelector(".delete-btn").onclick = () => { row.remove(); refreshAll(); };
      condDiv.appendChild(row);
      refreshAll();
    }

    function addGroupBy() {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <select class="group-col"></select>
        <button class="delete-btn">×</button>
      `;
      row.querySelector(".group-col").addEventListener("change", e => {
        const val = e.target.value;
        if (val) addToSelectIfMissing(val);
        refreshAll();
      });
      row.querySelector(".delete-btn").onclick = () => { row.remove(); refreshAll(); };
      groupByDiv.appendChild(row);
      refreshAll();
    }

    function addOrderBy() {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <select class="order-col"></select>
        <select class="order-dir"><option>ASC</option><option>DESC</option></select>
        <button class="delete-btn">×</button>
      `;
      row.querySelector(".delete-btn").onclick = () => { row.remove(); refreshAll(); };
      orderByDiv.appendChild(row);
      refreshAll();
    }

    function resetAll() {
      selectColsDiv.innerHTML = joinsDiv.innerHTML = condDiv.innerHTML = groupByDiv.innerHTML = orderByDiv.innerHTML = "";

      if (!baseAliasInp.value.trim() && baseTableSel.value) {
        baseAliasInp.value = baseTableSel.value.charAt(0).toLowerCase();
      }

      addSelect();
      addCondition();
      refreshAll();
    }

    function generateSQL() {
      const aliasMap = getAliasMap();
      if (!baseTableSel.value) return null;

      let sql = "SELECT\n  ";

      const selectParts = [];
      selectColsDiv.querySelectorAll(".row").forEach(r => {
        const col = r.querySelector(".select-col")?.value;
        const as  = r.querySelector(".select-alias")?.value.trim();
        if (col) selectParts.push(as ? `${col} AS ${as}` : col);
      });
      sql += selectParts.length ? selectParts.join(",\n  ") : "*";

      sql += `\nFROM ${baseTableSel.value}`;
      const ba = baseAliasInp.value.trim();
      if (ba) sql += ` ${ba}`;

      joinsDiv.querySelectorAll(".join-row").forEach(r => {
        const type  = r.querySelector(".join-type")?.value;
        const table = r.querySelector(".join-table")?.value;
        const alias = r.querySelector(".join-alias")?.value.trim();
        const left  = r.querySelector(".left-col")?.value;
        const op    = r.querySelector(".join-op")?.value;
        const right = r.querySelector(".right-col")?.value;

        if (table && alias && left && op && right) {
          sql += `\n${type} ${table} ${alias}\n  ON ${left} ${op} ${right}`;
        }
      });

      const whereParts = [];
      condDiv.querySelectorAll(".row").forEach(r => {
        const col = r.querySelector(".where-col")?.value;
        const op  = r.querySelector(".where-op")?.value;
        let val   = r.querySelector(".where-value")?.value.trim();

        if (col && op) {
          if (["IS NULL", "IS NOT NULL"].includes(op)) {
            whereParts.push(`${col} ${op}`);
          } else if (val) {
            if (!isNaN(val)) {
              whereParts.push(`${col} ${op} ${val}`);
            } else {
              whereParts.push(`${col} ${op} '${val.replace(/'/g, "''")}'`);
            }
          }
        }
      });
      if (whereParts.length) sql += `\nWHERE\n  ${whereParts.join(" AND\n  ")}`;

      const groupParts = Array.from(groupByDiv.querySelectorAll(".group-col"))
        .map(s => s.value).filter(Boolean);
      if (groupParts.length) sql += `\nGROUP BY ${groupParts.join(", ")}`;

      const orderParts = [];
      orderByDiv.querySelectorAll(".row").forEach(r => {
        const col = r.querySelector(".order-col")?.value;
        const dir = r.querySelector(".order-dir")?.value;
        if (col) orderParts.push(`${col} ${dir}`);
      });
      if (orderParts.length) sql += `\nORDER BY ${orderParts.join(", ")}`;

      const lim  = limitInput.value.trim();
      const off  = offsetInput.value.trim();
      if (lim && !isNaN(lim)) {
        sql += `\nLIMIT ${lim}`;
        if (off && !isNaN(off)) sql += ` OFFSET ${off}`;
      }

      sql += ";";
      return sql;
    }

    function closeModal() {
      modal.remove();
      onClose();
    }

    resetAll();


  // Inject styles only once
  if (!document.getElementById("sql-builder-styles")) {
    const style = document.createElement("style");
    style.id = "sql-builder-styles";
    style.textContent = `
      .sql-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9998; }
      .sql-modal-content { position:fixed; top:5%; left:5%; right:5%; max-height:90%; background:gray; border-radius:0px; box-shadow:0 10px 40px rgba(0,0,0,0.3); z-index:9999; overflow-y:auto; }
      .sql-modal-header { padding:14px 20px; background:#f8f9fa; border-bottom:1px solid #dee2e6; display:flex; justify-content:space-between; align-items:center; }
      .sql-modal-header h2 { margin:0; font-size:1.5em; }
      .sql-close-btn { font-size:32px; font-weight:bold; background:none; border:none; cursor:pointer; color:#6c757d; }
      .sql-modal-body { padding:20px; }
      .section { margin-bottom:22px; }
      .row { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px; }
      .add-btn { background:#28a745; color:white; border:none; padding:6px 14px; border-radius:0px; cursor:pointer; }
      .delete-btn { background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:0px; cursor:pointer; }
      .generate-btn { background:#0d6efd; color:white; border:none; padding:12px 24px; border-radius:0px; font-weight:bold; cursor:pointer; }
      .close-btn { background:#6c757d; color:white; border:none; padding:12px 24px; border-radius:0px; cursor:pointer; margin-left:12px; }
      pre { background:#282c34; color:#abb2bf; padding:16px; border-radius:0px; font-family:Consolas,monospace; white-space:pre-wrap; overflow-x:auto; }
      select, input { padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:14px; }
      .join-alias { border-color:#e67e22 !important; }
    `;
    document.head.appendChild(style);
  }
};