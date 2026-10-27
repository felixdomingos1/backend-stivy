-- Novos tipos de fazedor da área de beleza
ALTER TABLE `FAZEDOR` MODIFY `tipo_fazedor` ENUM('agencia', 'estilista', 'maquiador', 'fotografo', 'modelo_freelancer', 'videografo', 'designer', 'influenciador', 'criador_conteudo', 'cabeleireiro', 'barbeiro', 'produtor_eventos', 'publicidade', 'marketing', 'desfiles', 'casting', 'moda', 'trancista', 'manicure', 'esteticista', 'outros') NOT NULL;

-- Medidas dos modelos com casas decimais (idade e sapato continuam inteiros)
ALTER TABLE `MODELO` MODIFY `busto` DECIMAL(5, 1) NULL,
    MODIFY `cintura` DECIMAL(5, 1) NULL,
    MODIFY `quadril` DECIMAL(5, 1) NULL,
    MODIFY `roupa` DECIMAL(4, 1) NULL;

ALTER TABLE `MODELO_FREELANCER` MODIFY `busto` DECIMAL(5, 1) NULL,
    MODIFY `cintura` DECIMAL(5, 1) NULL,
    MODIFY `quadril` DECIMAL(5, 1) NULL,
    MODIFY `roupa` DECIMAL(4, 1) NULL;
