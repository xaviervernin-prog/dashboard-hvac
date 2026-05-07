async function getNextNumber(client, nom, prefix) {
  const year = new Date().getFullYear();
  const key = `${nom}_${year}`;

  await client.query(
    `INSERT INTO sequences (nom, valeur) VALUES ($1, 0) ON CONFLICT (nom) DO NOTHING`,
    [key]
  );

  const { rows } = await client.query(
    `UPDATE sequences SET valeur = valeur + 1 WHERE nom = $1 RETURNING valeur`,
    [key]
  );

  return `${prefix}-${year}-${String(rows[0].valeur).padStart(3, '0')}`;
}

module.exports = { getNextNumber };
