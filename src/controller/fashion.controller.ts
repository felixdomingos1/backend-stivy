import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { CreateServicoDto, UpdateServicoDto } from '../dtos/fashion.dto';
import { AuthRequest } from '../middleware/auth.middleware';
import { handleUploadError, processUpload, uploadSingle } from '../middleware/upload.middleware';
import { AvaliacaoRepository } from '../repositories/avaliacao.repository';
import { FazedorRepository } from '../repositories/fazedor.repository';
import { PortfolioRepository } from '../repositories/portfolio.repository';
import { ServicoRepository } from '../repositories/servico.repository';
import { ModeloRepository } from '../repositories/modelo.repository';
import { ServicoComentarioRepository } from '../repositories/servico-comentario.repository';
import { ServicoReacaoRepository } from '../repositories/servico-reacao.repository';
import { cloudinaryService } from '../services/cloudinary.service';
import { FashionService } from '../services/fashion.service';
import { PortfolioService } from '../services/portfolio.service';
import { ServicoImagemService } from '../services/servico-imagem.service';
import { ModeloService } from '../services/modelo.service';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import { ServicoComentarioService } from '../services/servico-comentario.service';
import { ServicoReacaoService } from '../services/servico-reacao.service';
import { ServicoCompartilhamentoService } from '../services/servico-compartilhamento.service';
import { ServicoCompartilhamentoRepository } from '../repositories/servico-compartilhamento.repository';

export class FashionController {
  private fashionService: FashionService;
  private portfolioService: PortfolioService;
  private servicoImagemService: ServicoImagemService;
  private modeloService: ModeloService;
  private servicoComentarioService: ServicoComentarioService;
  private servicoReacaoService: ServicoReacaoService;
  private servicoCompartilhamentoService: ServicoCompartilhamentoService;

  constructor() {
    const servicoRepository = new ServicoRepository();
    const fazedorRepository = new FazedorRepository();
    const avaliacaoRepository = new AvaliacaoRepository();
    const portfolioRepository = new PortfolioRepository();
    const modeloRepository = new ModeloRepository();
    const servicoComentarioRepository = new ServicoComentarioRepository();
    const servicoReacaoRepository = new ServicoReacaoRepository();
    const servicoCompartilhamentoRepository = new ServicoCompartilhamentoRepository();

    this.fashionService = new FashionService(
      servicoRepository,
      fazedorRepository,
      avaliacaoRepository
    );
    this.portfolioService = new PortfolioService(portfolioRepository);
    this.servicoImagemService = new ServicoImagemService();
    this.modeloService = new ModeloService(modeloRepository, fazedorRepository);
    this.servicoComentarioService = new ServicoComentarioService(servicoComentarioRepository, servicoRepository);
    this.servicoReacaoService = new ServicoReacaoService(servicoReacaoRepository);
    this.servicoCompartilhamentoService = new ServicoCompartilhamentoService(servicoCompartilhamentoRepository);
  }

  criarServicoWithUpload = [
    uploadSingle,
    handleUploadError,
    this.criarServico.bind(this)
  ];

  async criarServico(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const dto: CreateServicoDto = req.body;

      if (req.file) {
        const uploadResult = await processUpload(req.file, 'servicos', {
          width: 800,
          height: 600,
          quality: 85
        });
        dto.imagem_url = uploadResult?.url;
        dto.imagem_public_id = uploadResult?.public_id;
      }

      const result = await this.fashionService.createServico(req.usuarioId, dto);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async buscarServicoPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.fashionService.getServicoById(id);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarServicos(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        categoria,
        min_valor,
        max_valor,
        status,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        categoria: categoria as string,
        min_valor: min_valor ? parseFloat(min_valor as string) : undefined,
        max_valor: max_valor ? parseFloat(max_valor as string) : undefined,
        status: status as string,
        search: search as string
      };

      const result = await this.fashionService.listServicos(
        filters,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async atualizarServico(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const dto: UpdateServicoDto = JSON.parse(req.body.data || '{}');

      if (req.file) {
        const servicoAtual = await this.fashionService.getServicoById(id);
        if (servicoAtual.imagem_public_id) {
          await cloudinaryService.deleteFile(servicoAtual.imagem_public_id);
        }

        const uploadResult = await processUpload(req.file, 'servicos', {
          width: 800,
          height: 600,
          quality: 85
        });
        dto.imagem_url = uploadResult?.url;
        dto.imagem_public_id = uploadResult?.public_id;
      }

      const result = await this.fashionService.updateServico(id, req.usuarioId, dto);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removerServico(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const servico = await this.fashionService.getServicoById(id);
      if (servico.imagem_public_id) {
        await cloudinaryService.deleteFile(servico.imagem_public_id);
      }
      await this.fashionService.deleteServico(id, req.usuarioId);
      res.json({ success: true, message: 'Serviço removido com sucesso' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async buscarFazedorPorId(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.fashionService.getFazedorById(id);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarFazedores(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        tipo_fazedor,
        status_aprovacao,
        avaliacao_minima,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        tipo_fazedor: tipo_fazedor as string,
        status_aprovacao: status_aprovacao as string,
        avaliacao_minima: avaliacao_minima ? parseFloat(avaliacao_minima as string) : undefined,
        search: search as string
      };

      const result = await this.fashionService.listFazedores(
        filters,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarServicosDoFazedor(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.fashionService.getServicosDoFazedor(id);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async avaliarFazedor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const usuarioId = Array.isArray(req.usuarioId) ? req.usuarioId[0] : req.usuarioId;
      const { nota, comentario, id_fazedor } = req.body;

      const result = await this.fashionService.avaliarFazedor(
        usuarioId,
        id_fazedor,
        nota,
        comentario
      );

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarAvaliacoesDoFazedor(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { page = 1, limit = 20 } = req.query;

      const result = await this.fashionService.getAvaliacoesDoFazedor(
        id,
        Number(page),
        Number(limit)
      );

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getCategoriasServicos(_: Request, res: Response): Promise<void> {
    try {
      const result = await this.fashionService.getCategoriasServicos();
      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getTiposFazedores(_: Request, res: Response): Promise<void> {
    try {
      const result = await this.fashionService.getTiposFazedores();
      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getEstatisticasFazedor(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const result = await this.fashionService.getEstatisticasFazedor(req.usuarioId);
      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async adicionarPortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const fazedor = await this.fashionService.getFazedorByUserId(req.usuarioId);
      if (!fazedor) {
        res.status(404).json({ error: 'Perfil de fazedor não encontrado' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'Nenhuma imagem enviada' });
        return;
      }

      const { titulos } = req.body;
      const titulosArray = titulos ? (Array.isArray(titulos) ? titulos : [titulos]) : [];

      const imagensBuffer = files.map(file => file.buffer);
      const results = await this.portfolioService.adicionarMultiplasImagens(
        fazedor.id_fazedor,
        imagensBuffer,
        titulosArray
      );

      res.status(201).json({
        success: true,
        data: results,
        message: `${results.length} imagem(ns) adicionada(s) ao portfolio`
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarPortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const fazedor = await this.fashionService.getFazedorByUserId(req.usuarioId);
      if (!fazedor) {
        res.status(404).json({ error: 'Perfil de fazedor não encontrado' });
        return;
      }

      const portfolio = await this.portfolioService.listarPortfolio(fazedor.id_fazedor);

      res.json({
        success: true,
        data: portfolio,
        count: portfolio.length
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removerImagemPortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const fazedor = await this.fashionService.getFazedorByUserId(req.usuarioId);
      if (!fazedor) {
        res.status(404).json({ error: 'Perfil de fazedor não encontrado' });
        return;
      }

      await this.portfolioService.removerImagem(id, fazedor.id_fazedor);

      res.json({
        success: true,
        message: 'Imagem removida do portfolio com sucesso'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async reordenarPortfolio(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        res.status(400).json({ error: 'Lista de IDs inválida' });
        return;
      }

      const fazedor = await this.fashionService.getFazedorByUserId(req.usuarioId);
      if (!fazedor) {
        res.status(404).json({ error: 'Perfil de fazedor não encontrado' });
        return;
      }

      await this.portfolioService.reordenarImagens(fazedor.id_fazedor, ids);

      res.json({
        success: true,
        message: 'Portfolio reordenado com sucesso'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async adicionarImagensServico(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const servico = await this.fashionService.getServicoById(id);
      const fazedor = await this.fashionService.getFazedorByUserId(req.usuarioId);

      if (!fazedor || servico.id_fazedor !== fazedor.id_fazedor) {
        res.status(403).json({ error: 'Você não tem permissão para adicionar imagens a este serviço' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'Nenhuma imagem enviada' });
        return;
      }

      if (files.length > 5) {
        res.status(400).json({ error: 'Máximo de 5 imagens por serviço' });
        return;
      }

      const imagensBuffer = files.map(file => file.buffer);
      const results = await this.servicoImagemService.adicionarImagens(id, imagensBuffer);

      res.status(201).json({
        success: true,
        data: results,
        message: `${results.length} imagem(ns) adicionada(s) ao serviço`
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarImagensServico(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const imagens = await this.servicoImagemService.listarImagens(id);

      res.json({
        success: true,
        data: imagens,
        count: imagens.length
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removerImagemServico(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id_imagem = Array.isArray(req.params.id_imagem) ? req.params.id_imagem[0] : req.params.id_imagem;

      const imagem = await this.servicoImagemService.getImagemById(id_imagem);
      if (!imagem) {
        res.status(404).json({ error: 'Imagem não encontrada' });
        return;
      }

      const servico = await this.fashionService.getServicoById(imagem.id_servico);
      const fazedor = await this.fashionService.getFazedorByUserId(req.usuarioId);

      if (!fazedor || servico.id_fazedor !== fazedor.id_fazedor) {
        res.status(403).json({ error: 'Você não tem permissão para remover esta imagem' });
        return;
      }

      await this.servicoImagemService.removerImagem(id_imagem);

      res.json({
        success: true,
        message: 'Imagem removida do serviço com sucesso'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async definirImagemPrincipal(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id_imagem = Array.isArray(req.params.id_imagem) ? req.params.id_imagem[0] : req.params.id_imagem;

      const servico = await this.fashionService.getServicoById(id);
      const fazedor = await this.fashionService.getFazedorByUserId(req.usuarioId);

      if (!fazedor || servico.id_fazedor !== fazedor.id_fazedor) {
        res.status(403).json({ error: 'Você não tem permissão para definir a imagem principal' });
        return;
      }

      await this.servicoImagemService.definirPrincipal(id, id_imagem);

      res.json({
        success: true,
        message: 'Imagem principal definida com sucesso'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async criarModelo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }
      const data = req.body;
      const result = await this.modeloService.criarModelo(req.usuarioId, data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarModelosDaAgencia(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const { status, genero, search } = req.query;
      const filters = {
        status: status as string,
        genero: genero as string,
        search: search as string
      };

      const result = await this.modeloService.listarModelosDaAgencia(req.usuarioId, filters);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async buscarModeloPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.modeloService.buscarModeloPorId(id);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async atualizarModelo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }


      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = req.body;
      const result = await this.modeloService.atualizarModelo(id, req.usuarioId, data);

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removerModelo(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }


      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.modeloService.removerModelo(id, req.usuarioId);

      res.json({ success: true, message: 'Modelo removido com sucesso' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async adicionarFotoModelo(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'Nenhuma imagem enviada' });
        return;
      }


      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { titulo, descricao, categoria } = req.body;

      const result = await this.modeloService.adicionarFotoPortfolio(
        id,
        req.usuarioId,
        req.file.buffer,
        titulo,
        descricao,
        categoria
      );

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async comentarServico(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }


      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { comentario, parent_id } = req.body;

      const result = await this.servicoComentarioService.create({
        id_servico: id,
        id_usuario: req.usuarioId,
        comentario,
        parent_id
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async listarComentariosServico(req: Request, res: Response): Promise<void> {
    try {

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { page = 1, limit = 20 } = req.query;

      const result = await this.servicoComentarioService.findByServico(
        id,
        Number(page),
        Number(limit)
      );

      res.json({ success: true, ...result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async reagirComentario(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const id_comentario = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { tipo } = req.body;

      await this.servicoComentarioService.addReacao({
        id_comentario,
        id_usuario: req.usuarioId,
        tipo
      });

      res.json({ success: true, message: 'Reação adicionada' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removerReacaoComentario(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const id_comentario = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.servicoComentarioService.removeReacao(id_comentario, req.usuarioId);

      res.json({ success: true, message: 'Reação removida' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async deletarComentario(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const id_comentario = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await this.servicoComentarioService.delete(id_comentario, req.usuarioId);

      res.json({ success: true, message: 'Comentário removido' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async reagirServico(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }


      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { tipo } = req.body;

      await this.servicoReacaoService.addReacao({
        id_servico: id,
        id_usuario: req.usuarioId,
        tipo
      });

      res.json({ success: true, message: 'Reação adicionada' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removerReacaoServico(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }


      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      await this.servicoReacaoService.removeReacao(id, req.usuarioId);

      res.json({ success: true, message: 'Reação removida' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getReacoesServico(req: Request, res: Response): Promise<void> {
    try {

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const reacoes = await this.servicoReacaoService.getReacoesCount(id);
      const usuarioReacao = (req as AuthRequest).usuarioId ?
        await this.servicoReacaoService.getUserReacao(id, (req as AuthRequest).usuarioId!) : null;

        console.log(reacoes, usuarioReacao);
        
      res.json({
        success: true,
        data: {
          counts: reacoes,
          minha_reacao: usuarioReacao
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async compartilharServico(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.usuarioId) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }


      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { plataforma } = req.body;

      const result = await this.servicoCompartilhamentoService.create({
        id_servico: id,
        id_usuario: req.usuarioId,
        plataforma
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getCompartilhamentosServico(req: Request, res: Response): Promise<void> {
    try {

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const count = await this.servicoCompartilhamentoService.getCountByServico(id);

      res.json({
        success: true,
        data: { compartilhamentos: count }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: any, res: Response): void {
    logger.error('Erro no FashionController:', error);

    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, error: error.message });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, error: error.message });
    } else {
      const message = process.env.NODE_ENV === 'development'
        ? error.message
        : 'Erro interno do servidor';
      res.status(500).json({ success: false, error: message });
    }
  }
}
