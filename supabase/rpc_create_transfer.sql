-- Crear RPC para inserción atómica de transferencia y sus productos
-- Esto asegura que si la conexión falla, no se guarde una transferencia sin productos.
-- VERSIÓN 2: Eliminada columna creado_offline que no existe en la tabla.

CREATE OR REPLACE FUNCTION create_transfer_with_products(
  p_transferencia jsonb,
  p_productos jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_transfer_id bigint;
  v_prod jsonb;
  v_result jsonb;
BEGIN
  -- Insertar la transferencia principal
  INSERT INTO transferencias (
    origen_id,
    destino_id,
    entrega_nombre,
    recibe_nombre,
    fecha_hora,
    estado,
    autorizado_por
  ) VALUES (
    (p_transferencia->>'origen_id')::bigint,
    (p_transferencia->>'destino_id')::bigint,
    p_transferencia->>'entrega_nombre',
    p_transferencia->>'recibe_nombre',
    COALESCE((p_transferencia->>'fecha_hora')::timestamp, NOW()),
    COALESCE(p_transferencia->>'estado', 'pendiente'),
    (p_transferencia->>'autorizado_por')::uuid
  ) RETURNING id INTO v_transfer_id;

  -- Insertar cada uno de los productos
  FOR v_prod IN SELECT * FROM jsonb_array_elements(p_productos)
  LOOP
    INSERT INTO transferencia_productos (
      transferencia_id,
      producto,
      cantidad,
      unidad
    ) VALUES (
      v_transfer_id,
      v_prod->>'nombre',
      (v_prod->>'cantidad')::numeric,
      v_prod->>'unidad'
    );
  END LOOP;

  -- Devolver el registro insertado
  SELECT row_to_json(t) INTO v_result FROM transferencias t WHERE id = v_transfer_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
