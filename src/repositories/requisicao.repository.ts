// repositories/requisicao.repository.ts
import { PrismaClient, Requisicao, Prisma } from '@prisma/client';
import prisma from '../config/database';

export interface CreateRequisicaoData {
  id_solicitante: string;
  id_servico?: string;
  id_modelo?: string;
  mensagem?: string;
  contato_retorno?: string;
}

export interface UpdateRequisicaoData {
  status?: string;
  mensagem?: string;
  contato_retorno?: string;
  observacoes?: string;
  data_resposta?: Date;
}

export interface RequisicaoFilters {
  status?: string;
  id_solicitante?: string;
  id_fazedor?: string;
  data_inicio?: Date;
  data_fim?: Date;
}

// Tipo para Requisicao com todos os relacionamentos
export type RequisicaoWithRelations = Prisma.RequisicaoGetPayload<{
  include: {
    solicitante: {
      select: {
        id_usuario: true;
        nome: true;
        email: true;
        telefone: true;
        foto_perfil: true;
      };
    };
    servico: {
      include: {
        fazedor: {
          include: {
            usuario: {
              select: {
                id_usuario: true;
                nome: true;
                email: true;
                foto_perfil: true;
              };
            };
          };
        };
      };
    };
    modelo: {
      include: {
        agencia: {
          include: {
            fazedor: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true;
                    nome: true;
                    email: true;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

export class RequisicaoRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: CreateRequisicaoData): Promise<RequisicaoWithRelations> {
    const result = await this.prisma.requisicao.create({
      data: {
        id_solicitante: data.id_solicitante,
        id_servico: data.id_servico,
        id_modelo: data.id_modelo,
        mensagem: data.mensagem,
        contato_retorno: data.contato_retorno,
        status: 'pendente'
      },
      include: {
        solicitante: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            telefone: true,
            foto_perfil: true
          }
        },
        servico: {
          include: {
            fazedor: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
                    nome: true,
                    email: true,
                    foto_perfil: true
                  }
                }
              }
            }
          }
        },
        modelo: {
          include: {
            agencia: {
              include: {
                fazedor: {
                  include: {
                    usuario: {
                      select: {
                        id_usuario: true,
                        nome: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return result as RequisicaoWithRelations;
  }

  async findById(id: string): Promise<RequisicaoWithRelations | null> {
    const result = await this.prisma.requisicao.findUnique({
      where: { id_requisicao: id },
      include: {
        solicitante: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            telefone: true,
            foto_perfil: true
          }
        },
        servico: {
          include: {
            fazedor: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
                    nome: true,
                    email: true,
                    foto_perfil: true
                  }
                }
              }
            }
          }
        },
        modelo: {
          include: {
            agencia: {
              include: {
                fazedor: {
                  include: {
                    usuario: {
                      select: {
                        id_usuario: true,
                        nome: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return result as RequisicaoWithRelations | null;
  }

  async findAll(filters?: RequisicaoFilters, skip?: number, take?: number): Promise<RequisicaoWithRelations[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.id_solicitante) {
      where.id_solicitante = filters.id_solicitante;
    }

    if (filters?.data_inicio || filters?.data_fim) {
      where.data_requisicao = {};
      if (filters.data_inicio) {
        where.data_requisicao.gte = filters.data_inicio;
      }
      if (filters.data_fim) {
        where.data_requisicao.lte = filters.data_fim;
      }
    }

    const result = await this.prisma.requisicao.findMany({
      where,
      skip: skip || 0,
      take: take || 50,
      orderBy: { data_requisicao: 'desc' },
      include: {
        solicitante: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            telefone: true,
            foto_perfil: true
          }
        },
        servico: {
          include: {
            fazedor: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
                    nome: true,
                    email: true,
                    foto_perfil: true
                  }
                }
              }
            }
          }
        },
        modelo: {
          include: {
            agencia: {
              include: {
                fazedor: {
                  include: {
                    usuario: {
                      select: {
                        id_usuario: true,
                        nome: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return result as RequisicaoWithRelations[];
  }

  async count(filters?: RequisicaoFilters): Promise<number> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.id_solicitante) {
      where.id_solicitante = filters.id_solicitante;
    }

    return await this.prisma.requisicao.count({ where });
  }

  async update(id: string, data: UpdateRequisicaoData): Promise<RequisicaoWithRelations> {
    const result = await this.prisma.requisicao.update({
      where: { id_requisicao: id },
      data: {
        status: data.status as any,
        mensagem: data.mensagem,
        contato_retorno: data.contato_retorno,
        observacoes: data.observacoes,
        data_resposta: data.data_resposta || new Date()
      },
      include: {
        solicitante: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            telefone: true,
            foto_perfil: true
          }
        },
        servico: {
          include: {
            fazedor: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
                    nome: true,
                    email: true,
                    foto_perfil: true
                  }
                }
              }
            }
          }
        },
        modelo: {
          include: {
            agencia: {
              include: {
                fazedor: {
                  include: {
                    usuario: {
                      select: {
                        id_usuario: true,
                        nome: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return result as RequisicaoWithRelations;
  }

  async delete(id: string): Promise<Requisicao> {
    return await this.prisma.requisicao.delete({
      where: { id_requisicao: id }
    });
  }

  async findBySolicitante(id_solicitante: string): Promise<RequisicaoWithRelations[]> {
    const result = await this.prisma.requisicao.findMany({
      where: { id_solicitante },
      orderBy: { data_requisicao: 'desc' },
      include: {
        solicitante: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            telefone: true,
            foto_perfil: true
          }
        },
        servico: {
          include: {
            fazedor: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
                    nome: true,
                    email: true,
                    foto_perfil: true
                  }
                }
              }
            }
          }
        },
        modelo: {
          include: {
            agencia: {
              include: {
                fazedor: {
                  include: {
                    usuario: {
                      select: {
                        id_usuario: true,
                        nome: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return result as RequisicaoWithRelations[];
  }

  async findByFazedor(id_fazedor: string): Promise<RequisicaoWithRelations[]> {
    const result = await this.prisma.requisicao.findMany({
      where: {
        OR: [
          {
            servico: {
              id_fazedor
            }
          },
          {
            modelo: {
              agencia: {
                id_fazedor
              }
            }
          }
        ]
      },
      orderBy: { data_requisicao: 'desc' },
      include: {
        solicitante: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            telefone: true,
            foto_perfil: true
          }
        },
        servico: {
          include: {
            fazedor: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
                    nome: true,
                    email: true,
                    foto_perfil: true
                  }
                }
              }
            }
          }
        },
        modelo: {
          include: {
            agencia: {
              include: {
                fazedor: {
                  include: {
                    usuario: {
                      select: {
                        id_usuario: true,
                        nome: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return result as RequisicaoWithRelations[];
  }

  async updateStatus(id: string, status: string): Promise<RequisicaoWithRelations> {
    const result = await this.prisma.requisicao.update({
      where: { id_requisicao: id },
      data: {
        status: status as any,
        data_resposta: status !== 'pendente' ? new Date() : undefined
      },
      include: {
        solicitante: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
            telefone: true,
            foto_perfil: true
          }
        },
        servico: {
          include: {
            fazedor: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
                    nome: true,
                    email: true,
                    foto_perfil: true
                  }
                }
              }
            }
          }
        },
        modelo: {
          include: {
            agencia: {
              include: {
                fazedor: {
                  include: {
                    usuario: {
                      select: {
                        id_usuario: true,
                        nome: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return result as RequisicaoWithRelations;
  }

  async getEstatisticas(id_fazedor?: string, id_solicitante?: string): Promise<any> {
    const where: any = {};

    if (id_fazedor) {
      where.OR = [
        { servico: { id_fazedor } },
        { modelo: { agencia: { id_fazedor } } }
      ];
    }

    if (id_solicitante) {
      where.id_solicitante = id_solicitante;
    }

    const requisicoes = await this.prisma.requisicao.findMany({ where });

    const total = requisicoes.length;
    const pendentes = requisicoes.filter(r => r.status === 'pendente').length;
    const aceitas = requisicoes.filter(r => r.status === 'aceita').length;
    const recusadas = requisicoes.filter(r => r.status === 'recusada').length;
    const concluidas = requisicoes.filter(r => r.status === 'concluida').length;
    const canceladas = requisicoes.filter(r => r.status === 'cancelada').length;

    return {
      total,
      pendentes,
      aceitas,
      recusadas,
      concluidas,
      canceladas,
      taxa_aceitacao: total > 0 ? (aceitas / total) * 100 : 0,
      taxa_conclusao: total > 0 ? (concluidas / total) * 100 : 0
    };
  }
}
