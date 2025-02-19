const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Database = require('better-sqlite3');
const log = require('electron-log');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js') // Certifique-se de ter um preload configurado
    }
  });

  // Remove a barra de menu
  Menu.setApplicationMenu(null);

  log.transports.file.level = 'debug';
  log.info('App starting...');

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000').catch(err => {
      log.error('Failed to load dev URL:', err);
    });
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    log.info('Loading index from:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      log.error('Failed to load index.html:', err);
      dialog.showErrorBox('Erro', `Falha ao carregar o aplicativo: ${err.message}`);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeDatabase() {
  try {
    const dbPath = isDev
      ? path.join(__dirname, 'database.db')
      : path.join(process.resourcesPath, 'database.db');

    log.info('Database path:', dbPath);
    db = new Database(dbPath);

    // Criação do schema: produtos, pedidos, estoque, caixa, clientes e transações detalhadas
    db.exec(`
      /* Produtos */
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category TEXT NOT NULL,
        barcode TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted BOOLEAN NOT NULL DEFAULT 0
      );

      /* Pedidos e Itens de Pedidos */
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number INTEGER,
        customer_name TEXT,
        status TEXT,
        closed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity REAL,
        paid_quantity REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
      );

      /* Estoque e Movimentações de Estoque */
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        manual_name TEXT,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        min_quantity REAL NOT NULL,
        disable_low_stock_alert BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY(product_id) REFERENCES products(id)
      );
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventory_item_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(id)
      );

      /* Caixa */
      CREATE TABLE IF NOT EXISTS cash_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      /* Clientes */
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT,
        address TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      /* Transações de Clientes (Contas a Pagar) */
      CREATE TABLE IF NOT EXISTS customer_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
      );

      /* Itens de Transação de Clientes (Produtos Consumidos) */
      CREATE TABLE IF NOT EXISTS customer_transaction_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_transaction_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY(customer_transaction_id) REFERENCES customer_transactions(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
      );
    `);
  } catch (error) {
    log.error('Database error:', error);
    dialog.showErrorBox('Erro no Banco de Dados', `Erro ao inicializar o banco de dados: ${error.message}`);
    app.quit();
  }
}

app.whenReady().then(() => {
  initializeDatabase();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// =========================== IPC HANDLERS ===============================

// Produtos
ipcMain.handle('get-products', async () => {
  try {
    const stmt = db.prepare('SELECT * FROM products WHERE deleted = FALSE');
    return stmt.all();
  } catch (error) {
    log.error('Erro ao carregar produtos:', error);
    throw error;
  }
});

ipcMain.handle('add-product', (_, product) => {
  try {
    if (!product.name) {
      throw new Error("Nome do produto é obrigatório.");
    }
    const price = product.price !== undefined ? product.price : 0.00;
    const category = product.category || 'Outros';
    const stmt = db.prepare('INSERT INTO products (name, price, category, barcode) VALUES (?, ?, ?, ?)');
    const result = stmt.run(product.name, price, category, product.barcode || null);
    db.prepare('INSERT INTO inventory_items (product_id, quantity, unit, min_quantity) VALUES (?, 0, ?, 0)')
      .run(result.lastInsertRowid, product.unit || 'un');
    return result;
  } catch (error) {
    log.error('Error adding product:', error);
    throw error;
  }
});

ipcMain.handle('update-product', (_, product) => {
  try {
    const stmt = db.prepare('UPDATE products SET name = ?, price = ?, category = ?, barcode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(product.name, product.price, product.category, product.barcode || null, product.id);
  } catch (error) {
    log.error('Error updating product:', error);
    throw error;
  }
});

ipcMain.handle('delete-product', async (_, id) => {
  try {
    const deleteTransaction = db.transaction(() => {
      db.prepare('UPDATE products SET deleted = TRUE WHERE id = ?').run(id);
      db.prepare('DELETE FROM inventory_items WHERE product_id = ?').run(id);
    });
    deleteTransaction();
    return true;
  } catch (error) {
    log.error('Erro ao desativar produto e excluir item de estoque:', error);
    throw error;
  }
});

// Handler para buscar produto pelo código de barras
ipcMain.handle('get-product-by-barcode', async (_, barcode) => {
  try {
    const stmt = db.prepare('SELECT * FROM products WHERE barcode = ? AND deleted = FALSE');
    const product = stmt.get(barcode);
    return product;
  } catch (error) {
    log.error('Error fetching product by barcode:', error);
    throw error;
  }
});

// Pedidos
ipcMain.handle('get-orders', () => {
  const orders = db.prepare(`
    SELECT o.*, COALESCE(SUM(oi.quantity * p.price), 0) as total
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.status != 'closed'
    GROUP BY o.id
  `).all();
  return orders.map(order => ({
    ...order,
    items: db.prepare(`
      SELECT oi.id, oi.quantity, oi.paid_quantity, p.name as product_name, p.price, p.id as product_id
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id)
  }));
});

ipcMain.handle('create-order', (_, { tableNumber, customerName }) => {
  try {
    return db.prepare('INSERT INTO orders (table_number, customer_name, status) VALUES (?, ?, ?)')
      .run(tableNumber, customerName, 'open');
  } catch (error) {
    log.error('Error creating order:', error);
    throw error;
  }
});

ipcMain.handle('add-order-item', (_, { orderId, productId, quantity }) => {
  try {
    const existingItem = db.prepare('SELECT id, quantity FROM order_items WHERE order_id = ? AND product_id = ?')
      .get(orderId, productId);
    if (existingItem) {
      return db.prepare('UPDATE order_items SET quantity = quantity + ? WHERE id = ?')
        .run(quantity, existingItem.id);
    } else {
      return db.prepare('INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)')
        .run(orderId, productId, quantity);
    }
  } catch (error) {
    log.error('Error adding order item:', error);
    throw error;
  }
});

ipcMain.handle('remove-order-item', (_, itemId) => {
  try {
    return db.prepare('DELETE FROM order_items WHERE id = ?').run(itemId);
  } catch (error) {
    log.error('Error removing order item:', error);
    throw error;
  }
});

ipcMain.handle('pay-partial-order-items', (_, { orderId, items }) => {
  try {
    const updateStmt = db.prepare('UPDATE order_items SET paid_quantity = paid_quantity + ? WHERE id = ? AND order_id = ?');
    const transaction = db.transaction(() => {
      items.forEach(({ itemId, quantity }) => {
        updateStmt.run(quantity, itemId, orderId);
      });
    });
    transaction();
    return { success: true };
  } catch (error) {
    log.error('Error processing partial payment:', error);
    throw error;
  }
});

ipcMain.handle('close-order', (_, orderId) => {
  try {
    const closeOrderTransaction = db.transaction(() => {
      db.prepare('UPDATE orders SET status = \'closed\', closed_at = DATETIME(\'now\', \'localtime\') WHERE id = ?')
        .run(orderId);
      const orderItems = db.prepare(`
        SELECT oi.quantity, p.price
        FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?
      `).all(orderId);
      let orderTotal = 0;
      orderItems.forEach(item => {
        orderTotal += item.quantity * item.price;
      });
      db.prepare('INSERT INTO cash_transactions (type, amount, category, description) VALUES (\'entrada\', ?, \'venda\', \'Venda automática via pedido \' || ?)')
        .run(orderTotal, orderId);
      const orderItemsForStock = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
        .all(orderId);
      orderItemsForStock.forEach(item => {
        const inventoryItem = db.prepare('SELECT id, quantity FROM inventory_items WHERE product_id = ?')
          .get(item.product_id);
        if (inventoryItem) {
          let quantityToDeduct = item.quantity;
          if (inventoryItem.quantity < item.quantity) {
            quantityToDeduct = inventoryItem.quantity;
            log.warn(`Estoque insuficiente para o produto com ID: ${item.product_id}. Deduzindo apenas ${quantityToDeduct}.`);
          }
          const newQuantity = inventoryItem.quantity - quantityToDeduct;
          db.prepare('UPDATE inventory_items SET quantity = ? WHERE id = ?')
            .run(newQuantity, inventoryItem.id);
          db.prepare('INSERT INTO inventory_transactions (inventory_item_id, quantity, type, description) VALUES (?, ?, \'saida\', \'Venda automática via pedido \' || ?)')
            .run(inventoryItem.id, quantityToDeduct, orderId);
        }
      });
    });
    closeOrderTransaction();
    return { success: true };
  } catch (error) {
    log.error('Erro ao fechar pedido e atualizar estoque:', error);
    throw error;
  }
});

ipcMain.handle('toggle-low-stock-alert', (_, { itemId, disable }) => {
  try {
    return db.prepare('UPDATE inventory_items SET disable_low_stock_alert = ? WHERE id = ?')
      .run(disable ? 1 : 0, itemId);
  } catch (error) {
    log.error('Error toggling low stock alert:', error);
    throw error;
  }
});

// Novo: Handler para desativar alertas de estoque globalmente
ipcMain.handle('disable-all-stock-alerts', () => {
  try {
    const result = db.prepare('UPDATE inventory_items SET disable_low_stock_alert = 1').run();
    log.info(`Alertas desativados para ${result.changes} itens.`);
    return result.changes;
  } catch (error) {
    log.error('Error disabling all stock alerts:', error);
    throw error;
  }
});

// Caixa
ipcMain.handle('add-cash-transaction', (_, { type, amount, category, description }) => {
  try {
    return db.prepare('INSERT INTO cash_transactions (type, amount, category, description) VALUES (?, ?, ?, ?)')
      .run(type, amount, category, description);
  } catch (error) {
    log.error('Error adding cash transaction:', error);
    throw error;
  }
});

ipcMain.handle('get-cash-flow', async () => {
  try {
    const totalEntriesStmt = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM cash_transactions WHERE type = \'entrada\'');
    const totalExitsStmt = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM cash_transactions WHERE type = \'saida\'');
    const { total: total_entries } = totalEntriesStmt.get();
    const { total: total_exits } = totalExitsStmt.get();
    const balance = total_entries - total_exits;
    return { total_entries, total_exits, balance };
  } catch (error) {
    log.error('Error fetching cash flow:', error);
    throw error;
  }
});

// Estoque
ipcMain.handle('get-inventory-items', () => {
  try {
    return db.prepare(`
      SELECT ii.*, COALESCE(p.name, ii.manual_name) AS product_name, p.price, p.category
      FROM inventory_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      ORDER BY ii.id
    `).all();
  } catch (error) {
    log.error('Error fetching inventory items:', error);
    return [];
  }
});

ipcMain.handle('add-inventory-item', (_, item) => {
  try {
    if (item.manual_name && item.manual_name.trim() !== "") {
      return db.prepare(`
        INSERT INTO inventory_items (product_id, manual_name, quantity, unit, min_quantity, disable_low_stock_alert)
        VALUES (NULL, ?, ?, ?, ?, 0)
      `).run(item.manual_name, item.quantity, item.unit, item.min_quantity);
    } else {
      return db.prepare(`
        INSERT INTO inventory_items (product_id, quantity, unit, min_quantity, disable_low_stock_alert)
        VALUES (?, ?, ?, ?, 0)
      `).run(item.product_id, item.quantity, item.unit, item.min_quantity);
    }
  } catch (error) {
    log.error('Error adding inventory item:', error);
    throw error;
  }
});

// Atualização de quantidade – Reconhece "entrada" e "add" como adição
ipcMain.handle('update-inventory-quantity', (_, { id, quantity, type, description }) => {
  try {
    const currentItem = db.prepare('SELECT quantity FROM inventory_items WHERE id = ?').get(id);
    if (!currentItem) {
      throw new Error('Item de estoque não encontrado');
    }
    const isAddition = type === 'add' || type === 'entrada';
    const newQuantity = isAddition ? currentItem.quantity + quantity : currentItem.quantity - quantity;
    if (newQuantity < 0) {
      throw new Error('Quantidade insuficiente no estoque');
    }
    const updateStmt = db.prepare('UPDATE inventory_items SET quantity = ? WHERE id = ?');
    const transactionStmt = db.prepare('INSERT INTO inventory_transactions (inventory_item_id, quantity, type, description) VALUES (?, ?, ?, ?)');
    db.transaction(() => {
      updateStmt.run(newQuantity, id);
      transactionStmt.run(id, quantity, type, description);
    })();
    return db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
  } catch (error) {
    log.error('Error updating inventory quantity:', error);
    throw error;
  }
});

ipcMain.handle('get-inventory-transactions', (_, itemId) => {
  try {
    return db.prepare(`
      SELECT * FROM inventory_transactions
      WHERE inventory_item_id = ?
      ORDER BY created_at DESC
    `).all(itemId);
  } catch (error) {
    log.error('Error getting inventory transactions:', error);
    return [];
  }
});

ipcMain.handle('get-low-stock-items', () => {
  try {
    return db.prepare(`
      SELECT ii.*, COALESCE(p.name, ii.manual_name) AS product_name, p.price, p.category
      FROM inventory_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.quantity <= ii.min_quantity AND disable_low_stock_alert = 0
      ORDER BY ii.id
    `).all();
  } catch (error) {
    log.error('Error getting low stock items:', error);
    return [];
  }
});

ipcMain.handle('update-inventory-item', (_, item) => {
  try {
    return db.prepare('UPDATE inventory_items SET unit = ?, min_quantity = ? WHERE id = ?')
      .run(item.unit, item.min_quantity, item.id);
  } catch (error) {
    log.error('Error updating inventory item:', error);
    throw error;
  }
});

ipcMain.handle('delete-inventory-item', (_, itemId) => {
  try {
    const item = db.prepare('SELECT product_id FROM inventory_items WHERE id = ?').get(itemId);
    if (!item) {
      throw new Error('Item de estoque não encontrado');
    }
    if (item.product_id !== null) {
      throw new Error('Exclusão não permitida para itens vinculados a produtos');
    }
    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM inventory_transactions WHERE inventory_item_id = ?').run(itemId);
      db.prepare('DELETE FROM inventory_items WHERE id = ?').run(itemId);
    });
    deleteTransaction();
    return true;
  } catch (error) {
    log.error('Error deleting inventory item:', error);
    throw error;
  }
});

// Relatórios
ipcMain.handle('get-report', (_, { startDate, endDate, category, priceRange, sortBy }) => {
  try {
    const options = {
      timeZone: 'America/Sao_Paulo',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    const adjustedStartDate = new Date(startDate + 'T00:00:00').toLocaleString('sv-SE', options);
    const adjustedEndDate = new Date(endDate + 'T23:59:59').toLocaleString('sv-SE', options);
    let whereClause = `
      o.status = 'closed'
      AND DATETIME(o.closed_at, 'localtime') BETWEEN DATETIME(?, 'localtime') AND DATETIME(?, 'localtime')
    `;
    const params = [adjustedStartDate, adjustedEndDate];
    if (category) {
      whereClause += ` AND p.category = ?`;
      params.push(category);
    }
    if (priceRange) {
      if (priceRange === '0-15') {
        whereClause += ` AND p.price <= 15`;
      } else if (priceRange === '15-30') {
        whereClause += ` AND p.price > 15 AND p.price <= 30`;
      } else if (priceRange === '30+') {
        whereClause += ` AND p.price > 30`;
      }
    }
    const data = db.prepare(`
      SELECT COUNT(DISTINCT o.id) as total_orders,
             COALESCE(SUM(oi.quantity * p.price), 0) as total_revenue,
             COALESCE(SUM(oi.quantity), 0) as items_sold
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE ${whereClause}
    `).get(...params);
    let orderByClause = `revenue DESC`;
    if (sortBy === 'quantidade') {
      orderByClause = 'quantity DESC';
    } else if (sortBy === 'receita') {
      orderByClause = 'revenue DESC';
    } else if (sortBy === 'preco') {
      orderByClause = 'p.price DESC';
    }
    const topProductsQuery = `
      SELECT p.name,
             SUM(oi.quantity) as quantity,
             SUM(oi.quantity * p.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON o.id = oi.order_id
      WHERE ${whereClause}
      GROUP BY p.id
      ORDER BY ${orderByClause}
      LIMIT 5
    `;
    const topProducts = db.prepare(topProductsQuery).all(...params);
    return { ...data, topProducts };
  } catch (error) {
    log.error('Error generating report:', error);
    throw error;
  }
});

// Handler para Relatório Consolidado (Pedidos + Transações de Clientes)
ipcMain.handle('get-consolidated-report', (_, { startDate, endDate, category, priceRange, sortBy }) => {
  try {
    const options = {
      timeZone: 'America/Sao_Paulo',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    const adjustedStartDate = new Date(startDate + 'T00:00:00').toLocaleString('sv-SE', options);
    const adjustedEndDate = new Date(endDate + 'T23:59:59').toLocaleString('sv-SE', options);

    let ordersWhereClause = `
      o.status = 'closed'
      AND DATETIME(o.closed_at, 'localtime') BETWEEN DATETIME(?, 'localtime') AND DATETIME(?, 'localtime')
    `;
    const ordersParams = [adjustedStartDate, adjustedEndDate];
    if (category) {
      ordersWhereClause += ` AND p.category = ?`;
      ordersParams.push(category);
    }
    if (priceRange) {
      if (priceRange === '0-15') {
        ordersWhereClause += ` AND p.price <= 15`;
      } else if (priceRange === '15-30') {
        ordersWhereClause += ` AND p.price > 15 AND p.price <= 30`;
      } else if (priceRange === '30+') {
        ordersWhereClause += ` AND p.price > 30`;
      }
    }
    const ordersData = db.prepare(`
      SELECT COUNT(DISTINCT o.id) as total_orders,
             COALESCE(SUM(oi.quantity * p.price), 0) as total_revenue,
             COALESCE(SUM(oi.quantity), 0) as items_sold
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE ${ordersWhereClause}
    `).get(...ordersParams);

    const topProducts = db.prepare(`
      SELECT p.name,
             SUM(oi.quantity) as quantity,
             SUM(oi.quantity * p.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON o.id = oi.order_id
      WHERE ${ordersWhereClause}
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT 5
    `).all(...ordersParams);

    const customerTxStmt = db.prepare(`
      SELECT *
      FROM customer_transactions
      WHERE DATETIME(transaction_date, 'localtime') BETWEEN DATETIME(?, 'localtime') AND DATETIME(?, 'localtime')
    `);
    const customerTx = customerTxStmt.all(adjustedStartDate, adjustedEndDate);

    const customerCreditTx = customerTx.filter(t => t.type === 'credit');
    const customerPaymentTx = customerTx.filter(t => t.type === 'payment');

    const customerOrdersCount = customerCreditTx.length;
    const customerCreditRevenue = customerCreditTx.reduce((sum, t) => sum + t.amount, 0);
    const customerPaymentRevenue = customerPaymentTx.reduce((sum, t) => sum + t.amount, 0);

    const consolidated = {
      total_orders: ordersData.total_orders + customerOrdersCount,
      total_revenue: ordersData.total_revenue + customerCreditRevenue + customerPaymentRevenue,
      items_sold: ordersData.items_sold,
      topProducts: topProducts
    };

    return consolidated;
  } catch (error) {
    log.error('Error generating consolidated report:', error);
    throw error;
  }
});

ipcMain.handle('get-product-report', (_, { startDate, endDate, category }) => {
  try {
    const options = {
      timeZone: 'America/Sao_Paulo',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    const adjustedStartDate = new Date(startDate + 'T00:00:00').toLocaleString('sv-SE', options);
    const adjustedEndDate = new Date(endDate + 'T23:59:59').toLocaleString('sv-SE', options);
    let whereClause = `
      o.status = 'closed'
      AND DATETIME(o.closed_at, 'localtime') BETWEEN DATETIME(?, 'localtime') AND DATETIME(?, 'localtime')
    `;
    const params = [adjustedStartDate, adjustedEndDate];
    if (category && category.trim() !== '') {
      whereClause += ` AND p.category = ?`;
      params.push(category);
    }
    const productsData = db.prepare(`
      SELECT p.name,
             SUM(oi.quantity) as total_quantity,
             SUM(oi.quantity * p.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON o.id = oi.order_id
      WHERE ${whereClause}
      GROUP BY p.id
      ORDER BY total_quantity DESC
    `).all(...params);
    const topProduct = productsData.length ? productsData[0] : null;
    const bottomProduct = productsData.length ? productsData[productsData.length - 1] : null;
    return { productsData, topProduct, bottomProduct };
  } catch (error) {
    log.error('Error generating product report:', error);
    throw error;
  }
});

ipcMain.handle('get-beverage-report', (_, { startDate, endDate }) => {
  try {
    const options = {
      timeZone: 'America/Sao_Paulo',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    const adjustedStartDate = new Date(startDate + 'T00:00:00').toLocaleString('sv-SE', options);
    const adjustedEndDate = new Date(endDate + 'T23:59:59').toLocaleString('sv-SE', options);
    const whereClause = `
      o.status = 'closed'
      AND DATETIME(o.closed_at, 'localtime') BETWEEN DATETIME(?, 'localtime') AND DATETIME(?, 'localtime')
      AND p.category = 'bebida'
    `;
    const params = [adjustedStartDate, adjustedEndDate];
    const beveragesData = db.prepare(`
      SELECT p.name,
             SUM(oi.quantity) as total_quantity,
             SUM(oi.quantity * p.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON o.id = oi.order_id
      WHERE ${whereClause}
      GROUP BY p.id
      ORDER BY total_quantity DESC
    `).all(...params);
    const topBeverage = beveragesData.length ? beveragesData[0] : null;
    const bottomBeverage = beveragesData.length ? beveragesData[beveragesData.length - 1] : null;
    return { beveragesData, topBeverage, bottomBeverage };
  } catch (error) {
    log.error('Error generating beverage report:', error);
    throw error;
  }
});

// Clientes e Transações de Clientes
ipcMain.handle('get-customers', async () => {
  try {
    const stmt = db.prepare('SELECT * FROM customers ORDER BY created_at DESC');
    return stmt.all();
  } catch (error) {
    log.error('Error fetching customers:', error);
    throw error;
  }
});

ipcMain.handle('update-customer', (_, customer) => {
  try {
    const stmt = db.prepare('UPDATE customers SET name = ?, contact = ?, address = ?, notes = ? WHERE id = ?');
    return stmt.run(customer.name, customer.contact, customer.address, customer.notes, customer.id);
  } catch (error) {
    log.error('Error updating customer:', error);
    throw error;
  }
});

ipcMain.handle('delete-customer', async (_, id) => {
  try {
    const deleteTransaction = db.transaction(() => {
      db.prepare(`
        DELETE FROM customer_transaction_items 
        WHERE customer_transaction_id IN (
          SELECT id FROM customer_transactions WHERE customer_id = ?
        )
      `).run(id);
      db.prepare('DELETE FROM customer_transactions WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    });
    deleteTransaction();
    return true;
  } catch (error) {
    log.error('Error deleting customer:', error);
    throw error;
  }
});

ipcMain.handle('add-customer', (_, customer) => {
  try {
    const stmt = db.prepare('INSERT INTO customers (name, contact, address, notes) VALUES (?, ?, ?, ?)');
    const result = stmt.run(customer.name, customer.contact, customer.address, customer.notes);
    return { id: result.lastInsertRowid };
  } catch (error) {
    log.error('Error adding customer:', error);
    throw error;
  }
});

ipcMain.handle('get-customer-transactions', async (_, customerId) => {
  try {
    const stmt = db.prepare(`
      SELECT id, customer_id, amount, description, type, transaction_date as created_at
      FROM customer_transactions
      WHERE customer_id = ?
      ORDER BY transaction_date DESC
    `);
    return stmt.all(customerId);
  } catch (error) {
    log.error('Error fetching customer transactions:', error);
    throw error;
  }
});

// Handler para adicionar transação de cliente com baixa automática do estoque
ipcMain.handle('add-customer-transaction', (_, data) => {
  try {
    const { customer_id, items, amount, description } = data;
    if (customer_id === undefined || customer_id === null || !Array.isArray(items)) {
      throw new Error("Dados inválidos para a transação do cliente");
    }
    const created_at = new Date().toISOString();
    if (items.length === 0) {
      if (typeof amount !== 'number' || amount <= 0) {
        throw new Error("Valor inválido para o pagamento.");
      }
      const insertTransStmt = db.prepare(
        'INSERT INTO customer_transactions (customer_id, amount, description, type) VALUES (?, ?, ?, ?)'
      );
      const transResult = insertTransStmt.run(customer_id, amount, description || 'Pagamento', 'payment');
      db.prepare('INSERT INTO cash_transactions (type, amount, category, description) VALUES (?, ?, ?, ?)')
        .run('payment', amount, 'customer payment', description || 'Pagamento');
      mainWindow.webContents.send('customer-transaction-updated');
      return {
        id: transResult.lastInsertRowid,
        amount,
        description: description || 'Pagamento',
        type: 'payment',
        created_at
      };
    } else {
      let totalAmount = 0;
      const getProductStmt = db.prepare('SELECT price, name FROM products WHERE id = ?');
      items.forEach(item => {
        const product = getProductStmt.get(item.product_id);
        if (!product) {
          throw new Error(`Produto com id ${item.product_id} não encontrado.`);
        }
        totalAmount += product.price * item.quantity;
      });
      const combinedDescription = items.map(item => {
        const product = getProductStmt.get(item.product_id);
        return product ? `${product.name} x ${item.quantity}` : "";
      }).join(", ");
      const insertTransStmt = db.prepare(
        'INSERT INTO customer_transactions (customer_id, amount, description, type) VALUES (?, ?, ?, ?)'
      );
      const transResult = insertTransStmt.run(customer_id, totalAmount, combinedDescription, 'credit');
      const transaction_id = transResult.lastInsertRowid;
      const insertItemStmt = db.prepare(
        'INSERT INTO customer_transaction_items (customer_transaction_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
      );
      items.forEach(item => {
        const product = getProductStmt.get(item.product_id);
        insertItemStmt.run(transaction_id, item.product_id, item.quantity, product.price);
      });
      const selectInventoryStmt = db.prepare('SELECT id, quantity FROM inventory_items WHERE product_id = ?');
      const updateInventoryStmt = db.prepare('UPDATE inventory_items SET quantity = ? WHERE id = ?');
      const insertInventoryTransStmt = db.prepare('INSERT INTO inventory_transactions (inventory_item_id, quantity, type, description) VALUES (?, ?, ?, ?)');
      items.forEach(item => {
        const inventoryItem = selectInventoryStmt.get(item.product_id);
        if (inventoryItem) {
          let quantityToDeduct = item.quantity;
          if (inventoryItem.quantity < item.quantity) {
            quantityToDeduct = inventoryItem.quantity;
            log.warn(`Estoque insuficiente para o produto com ID: ${item.product_id}. Deduzindo apenas ${quantityToDeduct}.`);
          }
          const newQuantity = inventoryItem.quantity - quantityToDeduct;
          updateInventoryStmt.run(newQuantity, inventoryItem.id);
          insertInventoryTransStmt.run(inventoryItem.id, quantityToDeduct, 'saida', 'Baixa automática via transação de cliente ' + transaction_id);
        }
      });
      mainWindow.webContents.send('customer-transaction-updated');
      return {
        id: transaction_id,
        amount: totalAmount,
        description: combinedDescription,
        type: 'credit',
        created_at
      };
    }
  } catch (error) {
    log.error('Error adding customer transaction with items:', error);
    throw error;
  }
});

ipcMain.handle('get-all-transactions', async () => {
  try {
    const stmt = db.prepare('SELECT * FROM customer_transactions ORDER BY transaction_date DESC');
    return stmt.all();
  } catch (error) {
    log.error('Error fetching all transactions:', error);
    throw error;
  }
});

// =========================== FIM IPC HANDLERS ==============================

app.on('ready', () => {
  log.info('Backend pronto.');
});
